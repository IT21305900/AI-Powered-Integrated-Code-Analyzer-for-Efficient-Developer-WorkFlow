"use server";

import { promises as fs } from "fs";
import path from "path";
import { ChromaClient } from "chromadb";
import { AzureOpenAI } from "openai";

// Add these new imports
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { AzureChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";

// Initialize OpenAI Client
const model = new AzureChatOpenAI({
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
  model: "gpt-4o-mini",
});

// Initialize Chroma and Azure OpenAI
const chromaClient = new ChromaClient({ path: "http://localhost:8081" });
const embeddingClient = new AzureOpenAI({
  apiKey: process.env.AZURE_OPEN_AI_EMBEDDING_API_KEY!,
  endpoint: process.env.AZURE_OPEN_AI_EMBEDDING_ENDPOINT!,
  apiVersion: process.env.AZURE_OPEN_AI_EMBEDDING_API_VERSION!,
});

const outputFolder = path.resolve(process.cwd(), "generatedDocs");

async function ensureFolderExists(folderPath: string) {
  try {
    await fs.access(folderPath); // Check if the folder exists
  } catch {
    await fs.mkdir(folderPath, { recursive: true }); // Create it if it doesn't
  }
}

// Function to query ChromaDB for relevant documents with specific chunk types
const queryChroma = async (
  query: string,
  collectionName: string,
  filters: Record<string, any> = {},
  limit: number = 10
) => {
  const collection = await chromaClient.getOrCreateCollection({
    name: collectionName,
    embeddingFunction: {
      generate: async (texts: string[]) => {
        const response = await embeddingClient.embeddings.create({
          model: "text-embedding-ada-002",
          input: query,
        });
        return response.data.map((item) => item.embedding);
      },
    },
  });

  const docs = await collection.query({
    queryTexts: query,
    nResults: limit,
    where: filters,
  });

  return docs;
};

// Define Utility Functions for package.json analysis
async function readPackageJson(repository: string) {
  const repoFolder = path.resolve(process.cwd(), `repositories/${repository}`);
  const data = await fs.readFile(`${repoFolder}/package.json`, "utf-8");
  return JSON.parse(data);
}

// Create tools for LangChain agent
const createRetrievalTool = (collectionName: string) => {
  return new DynamicStructuredTool({
    name: "query_project_files",
    description: "Query project files based on a search query and filters",
    schema: z.object({
      query: z.string().describe("The search query to find relevant files"),
      chunkType: z
        .string()
        .optional()
        .describe(
          "The specific chunk type to filter on (e.g., 'code', 'file_info', 'route_info', 'component_info')"
        ),
      fileRole: z
        .string()
        .optional()
        .describe(
          "The file role to filter on (e.g., 'route', 'component', 'utility', 'layout', 'api')"
        ),
      isApiRoute: z.boolean().optional().describe("Filter for API routes"),
      hasServerActions: z
        .boolean()
        .optional()
        .describe("Filter for files with server actions"),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of results to return"),
    }),
    func: async ({
      query,
      chunkType,
      fileRole,
      isApiRoute,
      hasServerActions,
      limit = 5,
    }) => {
      // Build filters based on provided parameters
      const filters: Record<string, any> = {};

      if (chunkType) filters.chunkType = chunkType;
      if (fileRole) filters.fileRole = fileRole;
      if (isApiRoute !== undefined) filters.isApiRoute = isApiRoute;
      if (hasServerActions !== undefined)
        filters.hasServerActions = hasServerActions;

      const results = await queryChroma(query, collectionName, filters, limit);

      return JSON.stringify({
        documents: results.documents,
        ids: results.ids,
        metadatas: results.metadatas,
      });
    },
  });
};

const createPackageAnalysisTool = (repository: string) => {
  return new DynamicStructuredTool({
    name: "analyze_package_json",
    description:
      "Analyze package.json to extract project information and dependencies",
    schema: z.object({
      section: z
        .enum(["all", "scripts", "dependencies", "devDependencies", "project"])
        .describe("The section of package.json to analyze"),
    }),
    func: async ({ section }) => {
      const packageJson = await readPackageJson(repository);

      if (section === "all") {
        return JSON.stringify(packageJson);
      } else if (section === "scripts") {
        return JSON.stringify(packageJson.scripts || {});
      } else if (section === "dependencies") {
        return JSON.stringify(packageJson.dependencies || {});
      } else if (section === "devDependencies") {
        return JSON.stringify(packageJson.devDependencies || {});
      } else if (section === "project") {
        return JSON.stringify({
          name: packageJson.name,
          version: packageJson.version,
          description: packageJson.description,
          author: packageJson.author,
          license: packageJson.license,
        });
      }

      return "Section not found in package.json";
    },
  });
};

const createDocGenerationTool = (collectionName: string) => {
  return new DynamicStructuredTool({
    name: "generate_documentation_section",
    description: "Generate a documentation section based on a specific topic",
    schema: z.object({
      section: z.string().describe("The section title for the documentation"),
      documents: z
        .array(z.string())
        .describe("The documents to use for generating this section"),
      format: z
        .enum(["markdown", "html"])
        .default("markdown")
        .describe("The format of the output documentation"),
    }),
    func: async ({ section, documents, format }) => {
      const prompt = `
      # Documentation Generation Task

      You are generating the "${section}" section of documentation for a Next.js project.
      
      ## Guidelines:
      1. Write clear, comprehensive documentation in ${format} format
      2. Use proper heading hierarchy (h1, h2, h3, etc.)
      3. Include code examples with proper syntax highlighting
      4. Group related content logically
      5. Make it developer-friendly and easy to understand
      6. For code sections, use \`\`\` with the appropriate language identifier
      7. Focus on practical usage examples and clear explanations
      
      ## Content to document:
      ${documents.join("\n\n")}
      
      Please generate well-structured, professionally formatted documentation.
      `;

      const response = await model.invoke([new HumanMessage(prompt)]);
      return response.content.toString();
    },
  });
};

const createFileSaveTool = () => {
  return new DynamicStructuredTool({
    name: "save_documentation_file",
    description: "Save generated documentation to a file",
    schema: z.object({
      filePath: z.string().describe("The path where the file should be saved"),
      content: z.string().describe("The content to save to the file"),
      append: z
        .boolean()
        .default(false)
        .describe("Whether to append to the file or overwrite it"),
    }),
    func: async ({ filePath, content, append }) => {
      try {
        if (append) {
          await fs.appendFile(filePath, content, "utf-8");
        } else {
          await fs.writeFile(filePath, content, "utf-8");
        }
        return `Successfully ${
          append ? "appended to" : "saved"
        } file at ${filePath}`;
      } catch (error: any) {
        return `Error saving file: ${error.message}`;
      }
    },
  });
};

const createRouteMapGeneratorTool = (collectionName: string) => {
  return new DynamicStructuredTool({
    name: "generate_route_map",
    description: "Generate a visual map of the project's routes",
    schema: z.object({
      format: z
        .enum(["markdown", "html"])
        .default("markdown")
        .describe("The format of the route map"),
    }),
    func: async ({ format }) => {
      // Get all routes
      const routeResults = await queryChroma(
        "Find all routes in the project",
        collectionName,
        { chunkType: "route_info" },
        50
      );

      const routes =
        routeResults.metadatas?.map((meta: any, index: number) => ({
          path: meta.routePath,
          type: meta.routeType,
          isDynamic: meta.isDynamic,
          dynamicParams: meta.dynamicParams,
          isApiRoute: meta.isApiRoute,
          level: meta.routeLevel || 0,
        })) || [];

      // Sort routes by path to maintain hierarchy
      const sortedRoutes = routes.sort((a: any, b: any) => {
        if (a.level !== b.level) return a.level - b.level;
        return (a.path || "").localeCompare(b.path || "");
      });

      const prompt = `
      # Route Map Generation Task

      You need to create a ${format} representation of the project's routes.
      
      ## Routes Information:
      ${JSON.stringify(sortedRoutes, null, 2)}
      
      ## Guidelines:
      1. Create a visual hierarchy showing the route structure
      2. For markdown, use proper indentation and formatting
      3. Distinguish between static routes, dynamic routes, and API routes
      4. Show the dynamic parameters for dynamic routes
      5. Organize routes in a logical tree structure by path
      6. Make the route map visually clear and easy to navigate
      
      Please generate a well-structured, visually appealing route map that helps developers understand the project's routing structure.
      `;

      const response = await model.invoke([new HumanMessage(prompt)]);
      return response.content.toString();
    },
  });
};

// Create the main documentation generation function
export const generateDocumentation = async (repository: string) => {
  await ensureFolderExists(outputFolder);

  // Define the output file path
  const outputFilePath = path.join(
    outputFolder,
    `${repository}-documentation.md`
  );
  const publicFilePath = path.join("./public", `${repository}.md`);

  // Initialize the LangChain agent with tools
  const tools = [
    createRetrievalTool(repository),
    createPackageAnalysisTool(repository),
    createDocGenerationTool(repository),
    createFileSaveTool(),
    createRouteMapGeneratorTool(repository),
  ];

  console.log("Starting documentation generation for repository:", repository);

  try {
    // Create the system prompt
    const systemPrompt = `
    You are an expert documentation generator for Next.js projects. Your task is to create comprehensive, well-structured documentation for a Next.js project named "${repository}".
    
    ## Documentation Structure:
    1. Project Overview (title, description, technology stack)
    2. Environment Setup (installation, configuration, scripts)
    3. Application Architecture (folder structure, design patterns)
    4. Routing Structure (page routes, API routes, dynamic routes)
    5. Key Components (main components, props, usage)
    6. API Documentation (API routes, server actions)
    7. State Management (how state is managed in the application)
    8. Utilities and Helpers (utility functions, custom hooks)
    
    Use the available tools to gather information about the project and generate each section of the documentation.
    Ensure that code examples are properly formatted with syntax highlighting.
    Create clear and visually appealing documentation that will help developers understand the project.
    
    The final documentation should be comprehensive, well-structured, and professionally formatted in Markdown.
    
    Follow these steps:
    1. First, analyze the package.json to understand the project dependencies and scripts
    2. Then, explore the project structure to understand the architecture
    3. Identify and document the routes (both page routes and API routes)
    4. Document key components and their usage
    5. Document API endpoints and server actions
    6. Document utility functions and helpers
    7. Create a complete documentation file that includes all sections
    
    Let's start by generating the documentation section by section.
    `;

    // Create the prompt template in the format expected by LangChain
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    // Create the agent with the formatted prompt
    const agent = await createOpenAIFunctionsAgent({
      llm: model,
      tools,
      prompt,
    });

    const executor = AgentExecutor.fromAgentAndTools({
      agent,
      tools,
      verbose: true,
    });

    // Invoke the agent to generate documentation
    const result = await executor.invoke({
      input: `Generate comprehensive documentation for the "${repository}" Next.js project. The documentation should be saved to "${outputFilePath}" and also to "${publicFilePath}" for public access.`,
    });

    console.log("Documentation generation completed successfully");
    console.log("Documentation saved to:", outputFilePath);
    console.log("Public documentation saved to:", publicFilePath);

    return {
      success: true,
      message: "Documentation generated successfully",
      outputPath: outputFilePath,
    };
  } catch (error: any) {
    console.error("Error generating documentation:", error);

    // If the LangChain agent approach fails, fall back to the simpler method
    console.log("Falling back to simple documentation generation method...");
    return generateSimpleDocumentation(repository);
  }
};

// Fallback this function is a simplified version that doesn't use the LangChain agent
export const generateSimpleDocumentation = async (collectionName: string) => {
  // Define the output file path
  const outputFilePath = path.join(`./public`, `${collectionName}.md`);
  const lastupdate = new Date().toString();

  // Create a fresh file
  try {
    await fs.writeFile(
      outputFilePath,
      `# ${collectionName} Project Documentation\n\n*Generated on: ${lastupdate}*\n\n`,
      "utf-8"
    );
  } catch (error: any) {
    console.error(`Failed to initialize file: ${error.message}`);
    return { success: false, message: error.message };
  }

  console.log("Document generation started");

  // Generate table of contents
  const tocContent = `
## Table of Contents

1. [Project Overview](#project-overview)
2. [Environment Setup](#environment-setup)
3. [Application Architecture](#application-architecture)
4. [Routing Structure](#routing-structure)
5. [Key Components](#key-components)
6. [API Documentation](#api-documentation)
7. [Utilities and Helpers](#utilities-and-helpers)
  `;

  await fs.appendFile(outputFilePath, tocContent, "utf-8");

  // 1. Project Overview from package.json
  const packageJson = await readPackageJson(collectionName);
  const projectOverviewPrompt = `
    # Project Documentation Task

    Create a comprehensive Project Overview section for a Next.js project documentation.
    
    ## Project Information:
    Name: ${packageJson.name || collectionName}
    Version: ${packageJson.version || "N/A"}
    Description: ${packageJson.description || "No description provided"}
    
    ## Dependencies:
    ${JSON.stringify(packageJson.dependencies || {}, null, 2)}
    
    ## Dev Dependencies:
    ${JSON.stringify(packageJson.devDependencies || {}, null, 2)}
    
    ## Guidelines:
    1. Create a compelling project overview with a title, description, and technology stack
    2. Explain the purpose and main features of the project
    3. Highlight key technologies used (React, Next.js, etc.)
    4. Mention any specific patterns or approaches used (e.g., App Router vs Pages Router)
    5. Keep it concise but informative
    
    Format as well-structured Markdown with proper headings, lists, and formatting.
  `;

  const projectOverview = await model.invoke([
    new HumanMessage(projectOverviewPrompt),
  ]);
  await fs.appendFile(
    outputFilePath,
    `\n\n## Project Overview\n\n${projectOverview.content}`,
    "utf-8"
  );
  console.log("Project overview section completed");

  // 2. Environment Setup
  const setupPrompt = `
    # Documentation Task: Environment Setup
    
    Create the Environment Setup section for a Next.js project documentation.
    
    ## Project Information:
    Scripts: ${JSON.stringify(packageJson.scripts || {}, null, 2)}
    Dependencies: ${JSON.stringify(packageJson.dependencies || {}, null, 2)}
    Dev Dependencies: ${JSON.stringify(
      packageJson.devDependencies || {},
      null,
      2
    )}
    
    ## Guidelines:
    1. Create clear, step-by-step setup instructions
    2. Include prerequisites (Node.js version, etc.)
    3. Detail installation steps
    4. Explain environment variables needed
    5. Document how to start the development server
    6. Explain how to build for production
    7. Document testing procedures (if applicable)
    8. Explain any project-specific setup requirements
    
    Format as well-structured Markdown with proper headings, lists, and code blocks.
  `;

  const setupInstructions = await model.invoke([new HumanMessage(setupPrompt)]);
  await fs.appendFile(
    outputFilePath,
    `\n\n## Environment Setup\n\n${setupInstructions.content}`,
    "utf-8"
  );
  console.log("Environment setup section completed");

  // 3. Application Architecture
  const archQuery = "Understand the project architecture and folder structure";
  const archResults = await queryChroma(
    archQuery,
    collectionName,
    { chunkType: "file_info" },
    20
  );

  const architecturePrompt = `
    # Documentation Task: Application Architecture
    
    Create the Application Architecture section for a Next.js project documentation.
    
    ## Project Structure Information:
    ${JSON.stringify(archResults.documents || [], null, 2)}
    
    ## Guidelines:
    1. Explain the high-level architecture of the application
    2. Document the folder structure and organization
    3. Highlight key design patterns used
    4. Explain the separation of concerns (components, pages, API, etc.)
    5. Mention any specific architectural decisions
    
    Format as well-structured Markdown with proper headings, lists, and code blocks.
  `;

  const architectureSection = await model.invoke([
    new HumanMessage(architecturePrompt),
  ]);
  await fs.appendFile(
    outputFilePath,
    `\n\n## Application Architecture\n\n${architectureSection.content}`,
    "utf-8"
  );
  console.log("Application architecture section completed");

  // 4. Routing Structure
  const routeResults = await queryChroma(
    "Find all routes in the project",
    collectionName,
    { chunkType: "route_info" },
    30
  );

  const routes = routeResults.metadatas?.map((meta: any, index: number) => ({
    path: meta.routePath,
    type: meta.routeType,
    isDynamic: meta.isDynamic,
    dynamicParams: meta.dynamicParams,
    isApiRoute: meta.isApiRoute,
    document: routeResults.documents?.[index] || "",
    id: routeResults.ids?.[index] || "",
  }));

  const routingPrompt = `
    # Documentation Task: Routing Structure
    
    Create the Routing Structure section for a Next.js project documentation.
    
    ## Routes Information:
    ${JSON.stringify(routes || [], null, 2)}
    
    ## Guidelines:
    1. Create a visual hierarchy showing the route structure
    2. Explain the routing system used (App Router or Pages Router)
    3. Document page routes with their paths
    4. Document API routes with their methods and purposes
    5. Explain dynamic routes and their parameters
    6. Provide examples of how to navigate between routes
    7. Include code examples where appropriate
    
    Format as well-structured Markdown with proper headings, lists, and code blocks.
  `;

  const routingSection = await model.invoke([new HumanMessage(routingPrompt)]);
  await fs.appendFile(
    outputFilePath,
    `\n\n## Routing Structure\n\n${routingSection.content}`,
    "utf-8"
  );
  console.log("Routing structure section completed");

  // 5. Key Components
  const componentResults = await queryChroma(
    "Find important components in the project",
    collectionName,
    { chunkType: "component_info" },
    20
  );

  const componentsPrompt = `
    # Documentation Task: Key Components
    
    Create the Key Components section for a Next.js project documentation.
    
    ## Components Information:
    ${JSON.stringify(componentResults.documents || [], null, 2)}
    
    ## Guidelines:
    1. Document the main components in the application
    2. Explain the purpose and functionality of each component
    3. Document the props/parameters for each component
    4. Provide usage examples
    5. Explain any state management within components
    6. Document component relationships and composition
    
    Format as well-structured Markdown with proper headings, lists, and code blocks.
  `;

  const componentsSection = await model.invoke([
    new HumanMessage(componentsPrompt),
  ]);
  await fs.appendFile(
    outputFilePath,
    `\n\n## Key Components\n\n${componentsSection.content}`,
    "utf-8"
  );
  console.log("Key components section completed");

  // 6. API Documentation
  const apiResults = await queryChroma(
    "Find API routes and server actions",
    collectionName,
    {
      $or: [{ isApiRoute: true }, { hasServerActions: true }],
    },
    15
  );

  const apiPrompt = `
    # Documentation Task: API Documentation
    
    Create the API Documentation section for a Next.js project documentation.
    
    ## API Information:
    ${JSON.stringify(apiResults.documents || [], null, 2)}
    
    ## Guidelines:
    1. Document all API endpoints with their paths
    2. Explain the HTTP methods supported by each endpoint
    3. Document request parameters and body format
    4. Document response format and status codes
    5. Explain authentication requirements (if any)
    6. Document server actions and their usage
    7. Provide usage examples with code snippets
    
    Format as well-structured Markdown with proper headings, lists, and code blocks.
  `;

  const apiSection = await model.invoke([new HumanMessage(apiPrompt)]);
  await fs.appendFile(
    outputFilePath,
    `\n\n## API Documentation\n\n${apiSection.content}`,
    "utf-8"
  );
  console.log("API documentation section completed");

  // 7. Utilities and Helpers
  const utilResults = await queryChroma(
    "Find utility functions and helper modules",
    collectionName,
    { fileRole: "utility" },
    15
  );

  const utilPrompt = `
    # Documentation Task: Utilities and Helpers
    
    Create the Utilities and Helpers section for a Next.js project documentation.
    
    ## Utilities Information:
    ${JSON.stringify(utilResults.documents || [], null, 2)}
    
    ## Guidelines:
    1. Document utility functions and their purpose
    2. Explain custom hooks and their usage
    3. Document helper modules and services
    4. Provide usage examples with code snippets
    5. Explain how these utilities contribute to the application
    
    Format as well-structured Markdown with proper headings, lists, and code blocks.
  `;

  const utilSection = await model.invoke([new HumanMessage(utilPrompt)]);
  await fs.appendFile(
    outputFilePath,
    `\n\n## Utilities and Helpers\n\n${utilSection.content}`,
    "utf-8"
  );
  console.log("Utilities and helpers section completed");

  const publicFilePath = path.join(`./public`, `${collectionName}.md`);

  // Save to public file as well
  await fs.copyFile(outputFilePath, `./public/textdocumentation.md`);

  console.log("Documentation generation completed successfully");
  console.log(
    `Documentation saved to: ${outputFilePath} and ${publicFilePath}`
  );

  return {
    success: true,
    message: "Documentation generated successfully",
    outputPath: outputFilePath,
  };
};
