"use server";

import { promises as fs } from "fs";
import path from "path";
import { ChromaClient } from "chromadb";
import { AzureOpenAI } from "openai";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { AzureChatOpenAI } from "@langchain/openai";
import { cookies } from "next/headers";

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

async function ensureFolderExists(folderPath: string) {
  try {
    await fs.access(folderPath); // Check if the folder exists
  } catch {
    await fs.mkdir(folderPath, { recursive: true }); // Create it if it doesn't
  }
}

// Function to query ChromaDB for relevant documents
const queryChroma = async (
  query: string,
  collectionName: string,
  meta: {} | undefined,
  nResults?: number
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
    nResults: nResults || 5,
    where: meta,
  });

  return docs;
};

const generateRouting = async (sectionTitle: string, content: [], ids: []) => {
  let documentation = "";
  let index = 0;

  // Iterate through each content item (Next.js 14 code files)
  for (const file of content) {
    // Assuming each file is a string containing the code
    const fileContent = file;

    // Generate section documentation for each file using the model
    const fileDocumentation = await generateSectionMarkdown(
      sectionTitle + " " + ids[index],
      fileContent
    );

    // Append generated documentation to the overall documentation
    documentation += `\n\n## ${ids[index]}\n\n${fileDocumentation}`;

    index++; // Move to the next content item
  }

  return documentation;
};

// Generate Markdown for a given section
const generateSectionMarkdown = async (
  sectionTitle: string,
  content: string
) => {
  const response = await model.invoke([
    new HumanMessage(
      `Using the project context, generate code documentation which can help developers to identify the project codebase better. Use the md format to output the documentation. Identify the code files.`
    ),
    new AIMessage(`## ${sectionTitle}
      ### Explanation
      Explain the content first following the Next.js 14 context. 
      ${content}
      `),
  ]);

  return response.content || "";
};

// Function to append content to the documentation file
async function appendToFile(filePath: string, content: string) {
  try {
    await fs.appendFile(filePath, content, "utf-8");
  } catch (error: any) {
    console.error(`Failed to append to file: ${error.message}`);
  }
}

// Main flow to generate documentation
export const generateDocumentation = async (collectionName: string) => {
  //   const outputFolder = path.resolve(process.cwd(), "generatedDocs");
  //   await ensureFolderExists(outputFolder);
  // Define the output file path
  // Define the folder path inside "public"
  const folderPath = path.join("./public", collectionName);
  const outputFilePath = path.join(folderPath, `${collectionName}.md`);

  await ensureFolderExists(folderPath);

  const lastupdate = new Date().toString();

  // Clear the file if it exists (to start fresh)
  try {
    await fs.writeFile(outputFilePath, `Last Update ${lastupdate}`, "utf-8");
  } catch (error: any) {
    console.error(`Failed to initialize file: ${error.message}`);
  }

  console.log("Document Generation Started for " + collectionName);

  // 1. Updated Agents
  //   await ProjectIntroductionAgent({
  //     collectionName,
  //     outputPath: outputFilePath,
  //   });

  //   2. Local Dev Environment Config
  //   await DevSetupAgent({
  //     collectionName,
  //     outputPath: outputFilePath,
  //   });

  // 3. Package Agent
  //   await PackageDocumentationAgent({
  //     collectionName,
  //     outputPath: outputFilePath,
  //   });

  // 4. Tailwind Agent
  //   await TailwindCssAgent({
  //     collectionName,
  //     outputPath: outputFilePath,
  //   });

  // 5. Middleware Agent
  //   await MiddlewareAgent({ collectionName, outputPath: outputFilePath });

  // 6. App Router Agent
  await AppRouterDocumentationAgent({
    collectionName,
    outputPath: outputFilePath,
  });

  // 1. Environment Setup Guidelines
  //   const setupMarkdown = await packageJsonNode(collectionName);
  //   await appendToFile(
  //     outputFilePath,
  //     `##Environment Setup Guidelines\n\n${setupMarkdown}`
  //   );
  //   console.log("Environment setup guidelines completed successfully");

  // 2. Routing Documentation
  //   const routesQuery =
  //     "Query the NextJS 14 app routes files. Which file route path is ends with page.tsx or layout.tsx";
  //   const routesResults = await queryChroma(routesQuery, collectionName, {
  //     fileRole: "route",
  //   });

  //   const routes: any = routesResults.documents[0];
  //   const ids: any = routesResults.ids[0];
  //   const routesMarkdown = await generateRouting("Routing", routes, ids);
  //   await appendToFile(
  //     outputFilePath,
  //     `\n\n##Routing Documentation\n\n${routesMarkdown}`
  //   );
  //   console.log("Routing documentation iss completed successfully");

  // 3. Components and API Calls
  //   const componentsQuery =
  //     "Details about components, props, state usage, and API calls.";
  //   const componentsResults = await queryChroma(componentsQuery, collectionName, {
  //     fileRole: "component",
  //   });
  //   const componentsMarkdown = await generateSectionMarkdown(
  //     "Components and API Calls",
  //     componentsResults.documents.join("\n")
  //   );
  //   await appendToFile(
  //     outputFilePath,
  //     `\n\n##Components and API Calls\n\n${componentsMarkdown}`
  //   );

  // 4. Utility Files
  //   const utilsQuery = "Find the files ends with with .ts and .js";
  //   const utilityResults = await queryChroma(utilsQuery, collectionName, {
  //     fileRole: "utility",
  //   });
  //   const utilityMarkdown = await generateSectionMarkdown(
  //     "Utility Files",
  //     utilityResults.documents.join("\n")
  //   );
  //   await appendToFile(
  //     outputFilePath,
  //     `\n\n##Utility Functions\n\n${utilityMarkdown}`
  //   );

  console.log("Componenent explanation completed successfully");

  console.log(
    `Documentation generation completed. File saved at: ${outputFilePath}`
  );
};

// intro agent
const ProjectIntroductionAgent = async ({
  collectionName,
  outputPath,
}: {
  collectionName: string;
  outputPath: string;
}) => {
  // query the project readme file
  const queryIntro =
    "Query the project readme.md file and give a comprehensive introduction about the project.";
  const introResults = await queryChroma(
    queryIntro,
    collectionName,
    {
      fileRole: "readme",
    },
    1
  );

  // query the project package.json file
  const packageIntro =
    "Query the project package.json file and give a comprehensive introduction about the project.";
  const queryPackage = await queryChroma(
    packageIntro,
    collectionName,
    {
      fileRole: "package.json",
    },
    1
  );

  const readme: any = introResults.documents[0];
  const packagejson: any = queryPackage.documents[0];

  const output = await generateSection({
    sectionTitle: "Project Introduction",
    content: `Summarize the readme file content and develop a brief introduction to the project. 
      
      The readme content: ${readme[0]}
      
      Requirements:
      - Write a concise introduction summarized in maximum three paragraphs
      - Focus on the project's purpose, key features, and technology stack
      - Do not include project setup guidelines, only a summary about the project tech stacks and dependencies
      - If the readme content doesn't exist or is insufficient, write a brief summary about the project using the package.json content and the context of Next.js 14
      
      Package.json content: ${packagejson[0]}
      `,
  });

  // No need to add the heading as generateSection will already include it
  await appendToFile(outputPath, `\n\n${output}`);
  console.log("Project introduction documentation completed successfully");
};

// setup agent setup guideline
// setup agent with comprehensive setup guidelines
const DevSetupAgent = async ({
  collectionName,
  outputPath,
}: {
  collectionName: string;
  outputPath: string;
}) => {
  // query the project package.json file
  const packageIntro = "Query the project package.json file";
  const queryPackage = await queryChroma(
    packageIntro,
    collectionName,
    {
      fileRole: "package.json",
    },
    1
  );

  // query the project ts config file (if exists)
  const queryTSConfig = "Query the project tsconfig.json file";
  const TSConfig = await queryChroma(
    queryTSConfig,
    collectionName,
    {
      fileRole: "tsconfig.json",
    },
    1
  );

  // query the project next config file (if exists)
  const queryNextConfig = "Query the project next.config file";
  const NextConfig = await queryChroma(
    queryNextConfig,
    collectionName,
    {
      fileRole: "next.config",
    },
    1
  );

  // query tailwind config (if exists)
  const queryTailwindConfig = "Query the project tailwind.config file";
  const TailwindConfig = await queryChroma(
    queryTailwindConfig,
    collectionName,
    {
      fileRole: "tailwind.config",
    },
    1
  );

  // query environment variables sample file if exists
  const queryEnvExample =
    "Query the project .env.example or .env.local.example file";
  const EnvExample = await queryChroma(
    queryEnvExample,
    collectionName,
    {
      fileRole: ".env.example",
    },
    1
  );

  const packagejson: any = queryPackage.documents[0];
  const tsconfigjson: any = TSConfig.documents[0];
  const nextconfig: any = NextConfig.documents[0];
  const tailwindconfig: any = TailwindConfig.documents[0];
  const envexample: any = EnvExample.documents[0];

  const hasTypescript = tsconfigjson ? "Yes" : "No";
  const hasTailwind = tailwindconfig ? "Yes" : "No";
  const hasEnvExample = envexample ? "Yes" : "No";

  const output = await generateSection({
    sectionTitle: "Development Environment Setup",
    content: `
        Generate comprehensive developer setup guidelines with the following content requirements:
        
        1. Package Information:
           - Analyze the package.json dependencies and devDependencies: ${
             packagejson[0]
           }
           - Extract the required Node.js version (if specified)
           - Identify key libraries and frameworks being used
           - List the available npm scripts with explanations of what each does
        
        2. Next.js Configuration:
           - Detail the Next.js configuration from next.config.js: ${nextconfig}
           - Explain any custom webpack configurations, environment variables, image optimization settings, or other important Next.js configurations
           - Include any special build or deployment configurations
        
        3. TypeScript Setup:
           - The project ${
             hasTypescript === "Yes" ? "uses" : "does not use"
           } TypeScript
           - ${
             hasTypescript === "Yes"
               ? `Explain the TypeScript configuration: ${tsconfigjson}`
               : ""
           }
           - ${
             hasTypescript === "Yes"
               ? "Include any specific tsconfig settings that developers should be aware of"
               : ""
           }
        
        4. Tailwind CSS Setup:
           - The project ${
             hasTailwind === "Yes" ? "uses" : "does not use"
           } Tailwind CSS
           - ${
             hasTailwind === "Yes"
               ? `Explain the Tailwind configuration: ${tailwindconfig}`
               : ""
           }
           - ${
             hasTailwind === "Yes"
               ? "Describe how to work with Tailwind in this project including any custom theme configurations"
               : ""
           }
        
        5. Environment Variables:
           - ${
             hasEnvExample === "Yes"
               ? `Detail required environment variables based on: ${envexample}`
               : "Mention any environment variables that might be needed based on dependencies"
           }
           - Explain how to set up local environment variables
        
        6. Setup Step-by-Step Guide:
           - Provide a clear, numbered step-by-step process to set up the development environment from cloning the repo to running it locally
           - Include commands for installing dependencies, setting up environment variables, and starting the development server
           - Add troubleshooting tips for common setup issues
        
        7. Additional Tools:
           - List any additional tools or extensions recommended for development (VSCode extensions, browser tools, etc.)
        `,
  });

  // The section title is already included in the markdown output, so we don't need to add it again
  await appendToFile(outputPath, `\n\n${output}`);
  console.log(
    "Development environment setup documentation completed successfully with proper Markdown formatting"
  );
};

// dependency ageent
// NPM Package Documentation Agent
const PackageDocumentationAgent = async ({
  collectionName,
  outputPath,
}: {
  collectionName: string;
  outputPath: string;
}) => {
  console.log("Starting Package Documentation Agent...");

  // Query the project package.json file
  const packageQuery = "Query the project package.json file";
  const packageData = await queryChroma(
    packageQuery,
    collectionName,
    {
      fileRole: "package.json",
    },
    1
  );

  // Access the package.json content
  const packageJson: any = packageData.documents[0];

  // Parse the content to get dependency information
  let packageContent;
  try {
    packageContent = JSON.parse(packageJson[0]);
    console.log("Successfully parsed package.json");
  } catch (error) {
    console.error("Error parsing package.json:", error);
    // If we can't parse it as JSON, we'll treat it as a string
    packageContent = packageJson[0];
  }

  // Generate documentation for both dependencies and devDependencies
  const output = await generateSection({
    sectionTitle: "Project Dependencies",
    content: `
        Analyze the package.json file and provide detailed information about each dependency:
        
        Package.json content: ${packageJson[0]}
        
        For each dependency and devDependency in the package.json file:
        
        1. Create a subsection for "Production Dependencies" and "Development Dependencies"
        2. For each package, explain:
           - What the package is used for in the context of a Next.js project
           - Its core functionality and purpose
           - How it typically integrates with other technologies in the stack
           - Why it might have been chosen over alternatives
           - Any version-specific information that's important (if on an older/specific version)
        
        3. Group related packages where it makes sense (e.g., all testing libraries together)
        
        4. For key packages (like React, Next.js, state management libraries, UI libraries, etc.):
           - Provide more detailed explanations
           - Explain common usage patterns
        
        5. If there are unusual or project-specific packages:
           - Provide more context on what they might be used for in this specific project
        
        6. Conclude with a brief summary of the overall stack architecture based on these dependencies
      `,
  });

  // Append the output to the documentation file
  await appendToFile(outputPath, `\n\n${output}`);
  console.log("Package documentation completed successfully");
};

// CSS Agent
// Tailwind CSS Documentation Agent
// This agent analyzes the project's CSS styling approach, focusing on Tailwind CSS
// and global CSS files to provide a concise summary of the styling architecture.
const TailwindCssAgent = async ({
  collectionName,
  outputPath,
}: {
  collectionName: string;
  outputPath: string;
}) => {
  console.log("Starting Tailwind CSS Documentation Agent...");

  // Query the tailwind config file (if exists)
  const tailwindQuery = "Query the project tailwind.config file";
  const tailwindData = await queryChroma(
    tailwindQuery,
    collectionName,
    {
      fileRole: "tailwind.config",
    },
    1
  );

  // Query the global CSS file
  const globalCssQuery = "Query the project global CSS file";
  const globalCssData = await queryChroma(
    globalCssQuery,
    collectionName,
    {
      fileRole: "global.css",
    },
    1
  );

  // Query other CSS files to get a broader view of styling approach
  const cssFilesQuery = "Query other CSS files in the project";
  const cssFilesData = await queryChroma(
    cssFilesQuery,
    collectionName,
    {
      fileRole: "css",
    },
    3 // Get up to 3 additional CSS files to analyze patterns
  );

  // Query package.json to confirm Tailwind dependencies
  const packageQuery = "Query the project package.json file";
  const packageData = await queryChroma(
    packageQuery,
    collectionName,
    {
      fileRole: "package.json",
    },
    1
  );

  // Access the content of each file
  const tailwindConfig: any = tailwindData?.documents?.[0];
  const globalCss: any = globalCssData?.documents?.[0];
  const packageJson: any = packageData.documents?.[0];
  const cssFiles: any = cssFilesData?.documents || [];

  // Check if project uses Tailwind CSS
  let usesTailwind = false;
  if (tailwindConfig) {
    usesTailwind = true;
  } else if (packageJson) {
    try {
      const packageContent = JSON.parse(packageJson[0]);
      const allDeps = {
        ...(packageContent.dependencies || {}),
        ...(packageContent.devDependencies || {}),
      };
      usesTailwind = Object.keys(allDeps).some(
        (dep) => dep === "tailwindcss" || dep.includes("tailwind")
      );
    } catch (error) {
      console.error("Error parsing package.json:", error);
      // If parsing fails, check for 'tailwind' string in package.json
      usesTailwind = packageJson[0].includes("tailwindcss");
    }
  }

  // Check for CSS modules pattern
  const usesCssModules = cssFiles.some(
    (file: any) =>
      file[0].includes(".module.css") ||
      (typeof file[0] === "string" && file[0].includes("className={styles."))
  );

  // Check for styled-components
  const usesStyledComponents =
    packageJson &&
    (packageJson[0].includes("styled-components") ||
      packageJson[0].includes("emotion"));

  // Generate concise documentation about the styling approach
  const output = await generateSection({
    sectionTitle: "Styling Architecture",
    content: `
      Provide a concise summary of the project's styling approach with a focus on:
      
      ${
        usesTailwind
          ? `
      1. Tailwind CSS Implementation:
         - The project uses Tailwind CSS for styling
         - Tailwind Configuration: ${
           tailwindConfig
             ? tailwindConfig[0]
             : "Not found, but Tailwind dependencies detected"
         }
         - Highlight any custom theme configurations (colors, spacing, etc.)
         - Note any Tailwind plugins being used
      `
          : `
      1. CSS Approach:
         - The project does NOT use Tailwind CSS
         - Identify the primary styling method used instead (CSS Modules, Styled Components, etc.)
      `
      }
      
      2. CSS Files Analysis:
         - Global CSS file content: ${globalCss ? globalCss[0] : "Not found"}
         - Other CSS files found: ${cssFiles.length > 0 ? "Yes" : "No"}
         ${
           cssFiles.length > 0
             ? `- Sample additional CSS content: ${cssFiles
                 .slice(0, 2)
                 .map((file: any) => file[0].substring(0, 150) + "...")
                 .join("\n")}`
             : ""
         }
         - Identify important global styles, CSS variables, or CSS reset approaches
         - Note any imported fonts or base styles
         - Identify CSS organization patterns (CSS modules, component-specific files, etc.)
      
      3. Styling Architecture:
         - Summarize the overall styling approach in 1-2 sentences
         - CSS Modules: ${
           usesCssModules ? "Used in the project" : "Not detected"
         }
         - Styled Components/Emotion: ${
           usesStyledComponents ? "Used in the project" : "Not detected"
         }
         - Describe how styles are organized (global vs. component-level)
         - Note how developers should approach adding new styles to maintain consistency
      
      Keep the documentation brief and focused on the key design decisions.
      Highlight only the most important aspects that a developer needs to know to start working with the styles.
      The entire section should be concise - aim for clarity over comprehensiveness.
    `,
  });

  // Append the output to the documentation file
  await appendToFile(outputPath, `\n\n${output}`);
  console.log("Styling architecture documentation completed successfully");
};

// Next.js Middleware Documentation Agent
// This agent analyzes middleware files in a Next.js project and generates documentation

const MiddlewareAgent = async ({
  collectionName,
  outputPath,
}: {
  collectionName: string;
  outputPath: string;
}) => {
  console.log("Starting Middleware Documentation Agent...");

  // Query for middleware.ts or middleware.js files
  const middlewareQuery =
    "Query for middleware.ts or middleware.js files in the project";
  const middlewareData = await queryChroma(
    middlewareQuery,
    collectionName,
    {
      fileRole: "middleware",
    },
    1
  );

  // Look for middleware-related code in next.config.js
  const nextConfigQuery = "Query the project next.config file";
  const nextConfigData = await queryChroma(
    nextConfigQuery,
    collectionName,
    {
      fileRole: "next.config",
    },
    1
  );

  // Access the content of middleware files
  const middlewareFile = middlewareData?.documents?.[0] || null;
  const nextConfig = nextConfigData?.documents?.[0] || null;

  // Check if middleware is implemented
  const hasMiddleware = !!middlewareFile;

  // Generate documentation about middleware implementation
  const output = await generateSection({
    sectionTitle: "Middleware Implementation",
    content: `
        Document the project's middleware implementation with a focus on:
  
        ${
          hasMiddleware
            ? `
        1. Middleware Overview:
           - The project implements Next.js middleware
           - Middleware file content: ${middlewareFile[0]}
           - Identify the main functionality implemented in the middleware
           - Explain the purpose and role of this middleware in the application
        `
            : `
        1. Middleware Status:
           - The project does NOT implement custom Next.js middleware
           - Note that middleware could be added in the root directory as middleware.ts or middleware.js
        `
        }
        
        2. Middleware Configuration:
           - Next.config.js configuration related to middleware: ${
             nextConfig ? nextConfig[0] : "Not found"
           }
           - Document any matcher configurations that limit where middleware runs
           - Explain any middleware-specific settings in the project configuration
        
        3. Middleware Functionality:
           ${
             hasMiddleware
               ? `
           - Describe the core middleware functionality (authentication, redirects, headers, etc.)
           - Explain the request flow and how middleware intercepts it
           - Document any conditional logic in the middleware
           - Note important Edge API functions being used
           `
               : `
           - Suggest potential middleware use cases for this specific project
           - Provide a simple example of how middleware could be implemented
           `
           }
        
        4. Development Considerations:
           - Explain how developers should approach modifying or extending the middleware
           - Note any performance considerations or limitations
           - Document testing approaches for middleware functionality
        
        Keep the documentation concise and practical. Focus on helping developers understand the middleware's role in the application architecture and how to work with it effectively.
      `,
  });

  // Append the output to the documentation file
  await appendToFile(outputPath, `\n\n${output}`);
  console.log("Middleware documentation completed successfully");
};

const AppRouterDocumentationAgent = async ({
  collectionName,
  outputPath,
}: {
  collectionName: string;
  outputPath: string;
}) => {
  console.log("Starting App Router Documentation Agent");

  // Query for static routes (page.tsx files)
  const routesQuery = "Query for page.tsx files in the app directory";
  const routesData = await queryChroma(
    routesQuery,
    collectionName,
    {
      fileRole: "route",
    },
    10 // Get up to 10 static routes
  );

  // Check for layout files and other special files
  const layoutsQuery =
    "Query for layout.tsx or layout.js files in the app directory";
  const layoutsData = await queryChroma(
    layoutsQuery,
    collectionName,
    {
      fileRole: "layout",
    },
    5
  );

  // Access the files
  const routes: any = routesData?.documents || [];
  const routeIDs: any = routesData?.ids[0];

  // Append the output to the documentation file
  await appendToFile(outputPath, `\n\n\n\n# Web Routes (App Router)\n\n\n[n]`);

  const routeAgent = async (content: string[], ids: string[]) => {
    let index = 0;

    // Append the output to the documentation file
    await appendToFile(outputPath, `\n\n\n## Static Routes\n\n\n\n\n`);

    // Iterate through each content item (Next.js 14 code files)
    for (const file of content[0]) {
      const relativePath = ids[index].replace(/^repositories[\\/]/, "");
      await appendToFile(outputPath, `\n\n\n\n### ${relativePath}\n\n\n`);

      //   Generate documentation about middleware implementation
      const output = await generateSection({
        sectionTitle: `${relativePath}`,
        content: `Expalain the static route  ${file}`,
      });
      //   Append the output to the documentation file
      await appendToFile(outputPath, `\n\n\n${output}\n\n\n`);

      index++; // Move to the next content item
    }
  };

  await routeAgent(routes, routeIDs);

  const layouts: any = layoutsData?.documents || [];
  const layoutIDs: any = layoutsData?.ids[0];

  const layoutAgent = async (content: string[], ids: string[]) => {
    let index = 0;

    console.log("Content");
    console.log(content);
    console.log("IDs");
    console.log(ids);

    // Append the output to the documentation file
    await appendToFile(outputPath, `\n\n\n## Layout Routes\n\n\n`);

    // Iterate through each content item (Next.js 14 code files)
    for (const file of content[0]) {
      const relativePath = ids[index].replace(/^repositories[\\/]/, "");
      await appendToFile(outputPath, `\n\n\n\n### ${relativePath}\n\n\n\n`);

      //   Generate documentation about middleware implementation
      const output = await generateSection({
        sectionTitle: `${relativePath}`,
        content: `Expalain the static route  ${file}`,
      });
      //   Append the output to the documentation file
      await appendToFile(outputPath, `\n\n\n${output}\n\n\n`);

      index++; // Move to the next content item
    }
  };

  await layoutAgent(layouts, layoutIDs);

  // Append the output to the documentation file
  //   await appendToFile(outputPath, `\n\n${output}`);
  console.log("Middleware documentation completed successfully");
};

// generate the documemtation and save
const generateSection = async ({
  sectionTitle,
  content,
}: {
  sectionTitle: string;
  content: string;
}) => {
  const response = await model.invoke([
    new HumanMessage(
      `
      You are a helpful developer documentation generator for the Next.js repositories. 
      You are tasked to help bothe novice and experience developers to understand provided Next.js project repositories.
      Don't provide out of the context information other than the Next.js and web development context. 
      You will be provided with the Section Title which required to generate a documentation section and relavant code content for the each section. 
      You need analyze those content well and provide a developer friendly software industry standard  version of the documentation in well formated md for the each provided section. 
      Used the standard writing formate and tone when generate documentation, you can add comments for the code sections and programming related joke to improve the documentation readibility and understanding.
      `
    ),
    new HumanMessage(sectionTitle),
    new AIMessage(`project code file context: ${content}`),
    new HumanMessage(
      "Fomat the output well into the md document format document format"
    ),
  ]);

  return response.content || "";
};
