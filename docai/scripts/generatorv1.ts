"use server";

import { AzureChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { StateGraph } from "@langchain/langgraph";
import { MemorySaver, Annotation } from "@langchain/langgraph";
import { ChromaClient } from "chromadb";
import { promises as fs } from "fs"; // For file system operations
import { AzureOpenAI } from "openai";
import path from "path";

const embedApiKey = process.env.AZURE_OPEN_AI_EMBEDDING_API_KEY;
const embedEndpoint = process.env.AZURE_OPEN_AI_EMBEDDING_ENDPOINT;
const embedApiVersion = process.env.AZURE_OPEN_AI_EMBEDDING_API_VERSION;

// embedding Client
const embeddingClient = new AzureOpenAI({
  apiKey: embedApiKey,
  endpoint: embedEndpoint,
  apiVersion: embedApiVersion,
});

// Initialize ChromaDB Client
const chromaClient = new ChromaClient({ path: "http://localhost:8081" });

// Initialize OpenAI Client
const model = new AzureChatOpenAI({
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
  model: "gpt-4o-mini",
});

// Define Utility Functions
async function readPackageJson(repository: string) {
  const repoFolder = path.resolve(process.cwd(), `repositories/${repository}`);
  const data = await fs.readFile(`${repoFolder}/package.json`, "utf-8");
  return JSON.parse(data);
}

async function getDependenciesAnalysis(dependencies: Record<string, string>) {
  const dependencyDescriptions = await model.invoke([
    new HumanMessage(
      `Explain the following dependencies and their purpose in a project in the context of nextjs: ${Object.keys(
        dependencies
      ).join(", ")}`
    ),
  ]);

  // console.log("Dependency Analysis");
  // console.log(dependencyDescriptions);
  return dependencyDescriptions.content;
}

// Define Nodes
const retrieveNode = async (collectionName: string) => {
  const collection = await chromaClient.getOrCreateCollection({
    name: collectionName,
    embeddingFunction: {
      generate: async (texts: string[]) => {
        const response = await embeddingClient.embeddings.create({
          model: "text-embedding-ada-002",
          input: texts,
        });
        return response.data.map((item) => item.embedding);
      },
    },
  });

  const docs = await collection.query({
    queryTexts: "Retrieve app rounting content",
    nResults: 20,
  });

  // Extract documents and metadata
  const metadatas =
    docs.metadatas?.flat().filter((meta) => meta !== null) || [];

  return metadatas;
};

const packageJsonNode = async (repository: string) => {
  const packageJson = await readPackageJson(repository);
  const analysis = await getDependenciesAnalysis(packageJson.dependencies);
  return `# Dependencies\n\n${analysis}`; // Return an object
};

const routesNode = async () => {
  const routesDescription = await model.invoke([
    new HumanMessage(
      "Explain the Next.js 14 app routes based on the `app` directory structure."
    ),
  ]);
  return { content: `# Routes\n\n${routesDescription.content}` }; // Return an object
};

const deepDiveNode = async () => {
  const detailedAnalysis = await model.invoke([
    new HumanMessage(
      "Perform a deep dive into the app's codebase, focusing on server actions, components, and API usage."
    ),
  ]);
  return { content: `# Codebase Deep Dive\n\n${detailedAnalysis.content}` };
};

export const generatDocumentation = async (repository: string) => {
  try {
    const pkgs = await packageJsonNode(repository);
    const nodes = await retrieveNode(repository);

    // console.log("Content");
    // console.log(nodes);

    const documentation = `
        # Project Documentation
        ## Introduction
        using the project content generate an summary about the project ${pkgs} ${nodes}
        ## Development Environment
        using the project context explain how to setup development environment
        dev environment ${pkgs}
        ## Dependecies
        using the project context explain what are the dependencies used in the project
        dependenciew ${pkgs}
        ## Explanation of the app routes in the project and explain each rooute 
        code ${nodes}
      `;

    const mydocument = await model.invoke([
      new HumanMessage(
        `Using the poject context generate code documentation which can help developers to identify the project codebase better: ${documentation}
         Use the md format to output the doucmentation. Start the documentation with directly Title 
        )}`
      ),
    ]);

    console.log("mydocument");
    console.log(mydocument);

    // Save Markdown to File

    await fs.writeFile(
      "./public/DOCUMENTATION.md",
      // @ts-ignore
      JSON.stringify(mydocument.content),
      "utf-8"
    );

    console.log("Documentation generated and saved as DOCUMENTATION.md");
  } catch (error) {
    console.error("Error during workflow execution:", error);
  }
};

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
