"use server";

import { promises as fs } from "fs";
import path from "path";
import { ChromaClient } from "chromadb";
import { AzureOpenAI } from "openai";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { AzureChatOpenAI } from "@langchain/openai";

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
await ensureFolderExists(outputFolder);

// Function to query ChromaDB for relevant documents
const queryChroma = async (
  query: string,
  collectionName: string,
  meta: {} | undefined
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
    nResults: 5,
    where: meta,
  });

  console.log(docs);

  return docs;
};

// Define Utility Functions
async function readPackageJson(repository: string) {
  const repoFolder = path.resolve(process.cwd(), `repositories/${repository}`);
  const data = await fs.readFile(`${repoFolder}/package.json`, "utf-8");
  return JSON.parse(data!);
}

async function getSetupGuidelines(scripts: Record<string, string>) {
  const setupDescriptions = await model.invoke([
    new HumanMessage(`
      ##Based on the following package.json:
      
      scripts: : ${Object.keys(scripts).join(",")}
      
      Generate detailed setup instructions for this specific project. Include steps for:
      1. Installing dependencies.
      2. Running development scripts.
      3. Any special setup considerations (e.g., environment variables or additional tools).
      4. Explaining the purpose of the available npm scripts.
      `),
  ]);

  return setupDescriptions.content;
}

// analyze the dependencies
async function getDependenciesAnalysis(dependencies: Record<string, string>) {
  const dependencyDescriptions = await model.invoke([
    new HumanMessage(
      `## Development Environment
        using the project context explain how to setup development environment
        dev environment : expalain the each dependency ${Object.keys(
          dependencies
        ).join(",")}`
    ),
  ]);

  return dependencyDescriptions.content;
}

const packageJsonNode = async (repository: string) => {
  const packageJson = await readPackageJson(repository);
  const setup = await getSetupGuidelines(packageJson.scripts);
  const packages = await getDependenciesAnalysis(packageJson.dependencies);

  return `
  ## Environment Setup Guidelines 
  \n\n
  ### Project Setup Guidelines
  \n
  ${setup}
  \n\n
  ### Dependency Explanations
  ${packages}
   \n`;
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
  // Define the output file path
  const outputFilePath = path.join(`./public`, `${collectionName}.md`);

  // Clear the file if it exists (to start fresh)
  try {
    await fs.writeFile(outputFilePath, "", "utf-8");
  } catch (error: any) {
    console.error(`Failed to initialize file: ${error.message}`);
  }

  // 1. Environment Setup Guidelines
  const setupMarkdown = await packageJsonNode(collectionName);
  await appendToFile(
    outputFilePath,
    `# Environment Setup Guidelines\n\n${setupMarkdown}`
  );
  console.log("Environment setup guidelines completed successfully");

  // 2. Routing Documentation
  const routesQuery =
    "Query the NextJS 14 app routes files. Which file route path is ends with page.tsx or layout.tsx";
  const routesResults = await queryChroma(routesQuery, collectionName, {
    fileRole: "route",
  });

  const routes: [] = routesResults.documents[0];
  const ids: [] = routesResults.ids[0];
  const routesMarkdown = await generateRouting("Routing", routes, ids);
  await appendToFile(
    outputFilePath,
    `\n\n# Routing Documentation\n\n${routesMarkdown}`
  );
  console.log("Routing documentation iss completed successfully");

  // 3. Components and API Calls
  const componentsQuery =
    "Details about components, props, state usage, and API calls.";
  const componentsResults = await queryChroma(componentsQuery, collectionName, {
    fileRole: "component",
  });
  const componentsMarkdown = await generateSectionMarkdown(
    "Components and API Calls",
    componentsResults.documents.join("\n")
  );
  await appendToFile(
    outputFilePath,
    `\n\n# Components and API Calls\n\n${componentsMarkdown}`
  );

  // 3. Components and API Calls
  const utilsQuery = "Find the files ends with with .ts and .js";
  const utilityResults = await queryChroma(utilsQuery, collectionName, {
    fileRole: "utility",
  });
  const utilityMarkdown = await generateSectionMarkdown(
    "Components and API Calls",
    utilityResults.documents.join("\n")
  );
  await appendToFile(
    outputFilePath,
    `\n\n# Utility Functions\n\n${utilityMarkdown}`
  );

  console.log("Componenent explanation completed successfully");

  console.log(
    `Documentation generation completed. File saved at: ${outputFilePath}`
  );
};

// start

// import { AzureChatOpenAI } from "@langchain/openai";
// import { HumanMessage } from "@langchain/core/messages";
// import { StateGraph } from "@langchain/langgraph";
// import { MemorySaver } from "@langchain/langgraph";
// import { ChromaClient } from "chromadb";
// import { promises as fs } from "fs"; // For file system operations
// import { AzureOpenAI } from "openai";
// import path from "path";
// import {
//   getDependenciesAnalysis,
//   readPackageJson,
//   retrieveNode,
// } from "./tools";

// import { Annotation } from "@langchain/langgraph";
// import { BaseMessage } from "@langchain/core/messages";

// const GraphState = Annotation.Root({
//   messages: Annotation<BaseMessage[]>({
//     reducer: (x, y) => x.concat(y),
//     default: () => [],
//   }),
// });

// // const embedApiKey = process.env.AZURE_OPEN_AI_EMBEDDING_API_KEY;
// // const embedEndpoint = process.env.AZURE_OPEN_AI_EMBEDDING_ENDPOINT;
// // const embedApiVersion = process.env.AZURE_OPEN_AI_EMBEDDING_API_VERSION;

// // // embedding Client
// // const embeddingClient = new AzureOpenAI({
// //   apiKey: embedApiKey,
// //   endpoint: embedEndpoint,
// //   apiVersion: embedApiVersion,
// // });

// // // Initialize ChromaDB Client
// // const chromaClient = new ChromaClient({ path: "http://localhost:8081" });

// // Initialize LLM Client
// const model = new AzureChatOpenAI({
//   azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
//   azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
//   azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
//   azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
//   model: "gpt-4o-mini",
// });

// const packageJsonNode = async (repository: string) => {
//   const packageJson = await readPackageJson(repository);
//   const analysis = await getDependenciesAnalysis(packageJson.dependencies);
//   return `# Dependencies\n\n${analysis}`; // Return an object
// };

// export const generatDocumentation = async (repository: string) => {
//   try {
//     const pkgs = await packageJsonNode(repository);
//     const nodes = await retrieveNode(repository);

//     // console.log("Content");
//     // console.log(nodes);

//     const documentation = `
//         # Project Documentation
//         ## Introduction
//         using the project content generate an summary about the project ${pkgs} ${nodes}
//         ## Development Environment
//         using the project context explain how to setup development environment
//         dev environment ${pkgs}
//         ## Dependecies
//         using the project context explain what are the dependencies used in the project
//         dependenciew ${pkgs}
//         ## Explanation of the app routes in the project and explain each rooute
//         code ${nodes}
//       `;

//     const mydocument = await model.invoke([
//       new HumanMessage(
//         `Using the poject context generate code documentation which can help developers to identify the project codebase better: ${documentation}
//          Use the md format to output the doucmentation. Start the documentation with directly Title
//         )}`
//       ),
//     ]);

//     console.log("mydocument");
//     console.log(mydocument);

//     // Save Markdown to File
//     await fs.writeFile(
//       "./public/DOCUMENTATION.md",
//       mydocument.content,
//       "utf-8"
//     );

//     console.log("Documentation generated and saved as DOCUMENTATION.md");
//   } catch (error) {
//     console.error("Error during workflow execution:", error);
//   }
// };

//end

// "use server";

// import { AzureChatOpenAI } from "@langchain/openai";
// import { BaseMessage, HumanMessage } from "@langchain/core/messages";
// import { StateGraph } from "@langchain/langgraph";
// import { MemorySaver, Annotation } from "@langchain/langgraph";
// import { ChromaClient } from "chromadb";
// import { promises as fs } from "fs"; // For file system operations
// import { AzureOpenAI } from "openai";
// import path from "path";

// const repoFolder = path.resolve(process.cwd(), "repositories/zoom-clone");

// const embedApiKey = process.env.AZURE_OPEN_AI_EMBEDDING_API_KEY;
// const embedEndpoint = process.env.AZURE_OPEN_AI_EMBEDDING_ENDPOINT;
// const embedApiVersion = process.env.AZURE_OPEN_AI_EMBEDDING_API_VERSION;

// // embedding Client
// const embeddingClient = new AzureOpenAI({
//   apiKey: embedApiKey,
//   endpoint: embedEndpoint,
//   apiVersion: embedApiVersion,
// });

// const StateAnnotation = Annotation.Root({
//   messages: Annotation<BaseMessage[]>({
//     reducer: (x, y) => x.concat(y),
//   }),
//   documentation: Annotation<string[]>({
//     reducer: (x, y) => x.concat(y),
//   }),
// });

// // Initialize ChromaDB Client
// const chromaClient = new ChromaClient({ path: "http://localhost:8081" });

// // Initialize OpenAI Client
// const model = new AzureChatOpenAI({
//   azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
//   azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
//   azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
//   azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
//   model: "gpt-4o-mini",
// });

// // Define Utility Functions
// async function readPackageJson() {
//   const data = await fs.readFile(`${repoFolder}/package.json`, "utf-8");
//   // console.log("Package JSON");
//   // console.log(data);
//   return JSON.parse(data);
// }

// async function getDependenciesAnalysis(dependencies: Record<string, string>) {
//   const dependencyDescriptions = await model.invoke([
//     new HumanMessage(
//       `Explain the following dependencies and their purpose in a project in the context of nextjs: ${Object.keys(
//         dependencies
//       ).join(", ")}`
//     ),
//   ]);

//   // console.log("Dependency Analysis");
//   // console.log(dependencyDescriptions);
//   return dependencyDescriptions.content;
// }

// // Define Nodes
// const retrieveNode = async () => {
//   const collection = await chromaClient.getOrCreateCollection({
//     name: "project-analysis",
//     embeddingFunction: {
//       generate: async (texts: string[]) => {
//         const response = await embeddingClient.embeddings.create({
//           model: "text-embedding-ada-002",
//           input: texts,
//         });
//         return response.data.map((item) => item.embedding);
//       },
//     },
//   });

//   const docs = await collection.query({
//     queryTexts: "Retrieve project metadata for introduction",
//     nResults: 2,
//   });

//   // console.log(docs);

//   console.log("Documents New");
//   console.log(docs);

//   // Extract documents and metadata
//   const documents = docs.documents?.flat().filter((doc) => doc !== null) || [];
//   const metadatas =
//     docs.metadatas?.flat().filter((meta) => meta !== null) || [];

//   // Return the combined documents and metadata in markdown format
//   const combinedContent = documents
//     .map((doc, index) => {
//       return `## Document ${
//         index + 1
//       }\n${doc}\n\n### Metadata\n${JSON.stringify(metadatas[index], null, 2)}`;
//     })
//     .join("\n\n");

//   return { content: `# Project Metadata\n\n${combinedContent}` };
// };

// const packageJsonNode = async () => {
//   const packageJson = await readPackageJson();
//   const analysis = await getDependenciesAnalysis(packageJson.dependencies);
//   return { content: `# Dependencies\n\n${analysis}` }; // Return an object
// };

// const routesNode = async () => {
//   const routesDescription = await model.invoke([
//     new HumanMessage(
//       "Explain the Next.js 14 app routes based on the `app` directory structure."
//     ),
//   ]);
//   return { content: `# Routes\n\n${routesDescription.content}` }; // Return an object
// };

// const deepDiveNode = async () => {
//   const detailedAnalysis = await model.invoke([
//     new HumanMessage(
//       "Perform a deep dive into the app's codebase, focusing on server actions, components, and API usage."
//     ),
//   ]);
//   return { content: `# Codebase Deep Dive\n\n${detailedAnalysis.content}` };
// };

// export const generatDocumentation = async () => {
//   // Define Workflow
//   const workflow = new StateGraph(StateAnnotation)
//     .addNode("retrieve", retrieveNode)
//     .addNode("dependencies", packageJsonNode)
//     .addNode("routes", routesNode)
//     .addNode("deep-dive", deepDiveNode)
//     .addEdge("__start__", "retrieve")
//     .addEdge("retrieve", "dependencies")
//     .addEdge("dependencies", "routes")
//     .addEdge("routes", "deep-dive");

//   // Initialize Memory Saver
//   const checkpointer = new MemorySaver();

//   // Compile the Workflow
//   const app = workflow.compile({ checkpointer });

//   // Add logging to check if the workflow is compiled correctly
//   console.log("Workflow compiled", app);

//   try {
//     // Run the Workflow
//     const finalState = await app.invoke(
//       {},
//       { configurable: { thread_id: "doc-gen" } }
//     );

//     // Add logging to check the final state structure
//     console.log("Final State:", finalState);

//     if (finalState && finalState.messages) {
//       const documentation = `
//         # Project Documentation
//         ${finalState.messages.map((msg: any) => msg.content).join("\n\n")}
//       `;
//       // Save Markdown to File
//       await fs.writeFile("./DOCUMENTATION.md", documentation, "utf-8");

//       console.log("Documentation generated and saved as DOCUMENTATION.md");
//     } else {
//       console.error("No messages in final state.");
//     }
//   } catch (error) {
//     console.error("Error during workflow execution:", error);
//   }
// };

//v1

// ("use server");

// import { BaseMessage, HumanMessage } from "@langchain/core/messages";
// import { StateGraph } from "@langchain/langgraph";
// import { MemorySaver, Annotation } from "@langchain/langgraph";
// import { ChromaClient } from "chromadb";
// import { promises as fs } from "fs"; // For file system operations
// import { AzureOpenAI } from "openai";
// // import { z } from "zod";
// // import { ChatOpenAI } from "@langchain/openai";
// // import { ToolNode } from "@langchain/langgraph/prebuilt";
// // import { Chroma } from "@langchain/community/vectorstores/chroma";

// const apiKey = process.env.AZURE_OPEN_AI_API_KEY;
// const endpoint = process.env.AZURE_OPEN_AI_ENDPOINT;
// const apiVersion = process.env.AZURE_OPEN_AI_API_VERSION;

// // Define State Annotations
// const StateAnnotation = Annotation.Root({
//   messages: Annotation<BaseMessage[]>({
//     reducer: (x, y) => x.concat(y),
//   }),
//   documentation: Annotation<string[]>({
//     reducer: (x, y) => x.concat(y),
//   }),
// });

// // Initialize ChromaDB Client
// const chromaClient = new ChromaClient({ path: "http://localhost:8081" });

// // Initialize OpenAI Client
// const model = new AzureOpenAI({
//   apiKey: apiKey,
//   endpoint: endpoint,
//   apiVersion: apiVersion,
// });

// // Define Utility Functions
// async function readPackageJson() {
//   const data = await fs.readFile("./package.json", "utf-8");
//   return JSON.parse(data);
// }

// async function getDependenciesAnalysis(dependencies: Record<string, string>) {
//   const dependencyDescriptions = await model.invoke([
//     new HumanMessage(
//       `Explain the following dependencies and their purpose in a project: ${Object.keys(
//         dependencies
//       ).join(", ")}`
//     ),
//   ]);
//   return dependencyDescriptions.content;
// }

// // Define Nodes
// const retrieveNode = async () => {
//   const collection = await chromaClient.getOrCreateCollection({
//     name: "project-analysis",
//   });

//   const docs = await collection.query({
//     queryTexts: "Retrieve project metadata for introduction",
//     nResults: 4,
//   });
//   return docs;
// };

// const packageJsonNode = async () => {
//   const packageJson = await readPackageJson();
//   const analysis = await getDependenciesAnalysis(packageJson.dependencies);
//   return `# Dependencies\n\n${analysis}`;
// };

// const routesNode = async () => {
//   const routesDescription = await model.invoke([
//     new HumanMessage(
//       "Explain the Next.js 14 app routes based on the `app` directory structure."
//     ),
//   ]);
//   return `# Routes\n\n${routesDescription.content}`;
// };

// const deepDiveNode = async () => {
//   const detailedAnalysis = await model.invoke([
//     new HumanMessage(
//       "Perform a deep dive into the app's codebase, focusing on server actions, components, and API usage."
//     ),
//   ]);
//   return `# Codebase Deep Dive\n\n${detailedAnalysis.content}`;
// };

// export const generatDocumentation = async () => {
//   // Define Workflow
//   const workflow = new StateGraph(StateAnnotation)
//     .addNode("retrieve", retrieveNode)
//     .addNode("dependencies", packageJsonNode)
//     .addNode("routes", routesNode)
//     .addNode("deep-dive", deepDiveNode)
//     .addEdge("__start__", "retrieve")
//     .addEdge("retrieve", "dependencies")
//     .addEdge("dependencies", "routes")
//     .addEdge("routes", "deep-dive");

//   // Initialize Memory Saver
//   const checkpointer = new MemorySaver();

//   // Compile the Workflow
//   const app = workflow.compile({ checkpointer });

//   // Run the Workflow
//   const finalState = await app.invoke(
//     {},
//     { configurable: { thread_id: "doc-gen" } }
//   );

//   // Combine Output into Markdown
//   const documentation = `
// # Project Documentation
// ${finalState.messages.join("\n\n")}
// `;

//   // Save Markdown to File
//   await fs.writeFile("./DOCUMENTATION.md", documentation, "utf-8");

//   console.log("Documentation generated and saved as DOCUMENTATION.md");
// };
