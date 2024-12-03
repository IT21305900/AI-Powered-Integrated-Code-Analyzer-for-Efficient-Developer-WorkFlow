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

// Define Utility Functions Read Package JSON
export async function readPackageJson(repository: string) {
  const repoFolder = path.resolve(process.cwd(), `repositories/${repository}`);
  const data = await fs.readFile(`${repoFolder}/package.json`, "utf-8");
  return JSON.parse(data);
}

// Analyze Project Dependencies
export async function getDependenciesAnalysis(
  dependencies: Record<string, string>
) {
  const dependencyDescriptions = await model.invoke([
    new HumanMessage(
      `Explain the following dependencies and their purpose in a project in the context of nextjs: ${Object.keys(
        dependencies
      ).join(", ")}`
    ),
  ]);

  return dependencyDescriptions.content;
}

// Define Nodes
export const retrieveNode = async (collectionName: string) => {
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

export const packageJsonNode = async (repository: string) => {
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

// const deepDiveNode = async () => {
//   const detailedAnalysis = await model.invoke([
//     new HumanMessage(
//       "Perform a deep dive into the app's codebase, focusing on server actions, components, and API usage."
//     ),
//   ]);
//   return { content: `# Codebase Deep Dive\n\n${detailedAnalysis.content}` };
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

// "use server";
// import { AzureOpenAI } from "openai";
// import { traceable } from "langsmith/traceable";
// import { wrapOpenAI } from "langsmith/wrappers";
// import { tool } from "@langchain/core/tools";
// import { z } from "zod";

// import { AzureChatOpenAI } from "@langchain/openai";
// import { BaseMessage, HumanMessage } from "@langchain/core/messages";
// import { StateGraph } from "@langchain/langgraph";
// import { MemorySaver, Annotation } from "@langchain/langgraph";
// import { ChromaClient } from "chromadb";
// import { promises as fs } from "fs";

// const embedApiKey = process.env.AZURE_OPEN_AI_EMBEDDING_API_KEY;
// const embedEndpoint = process.env.AZURE_OPEN_AI_EMBEDDING_ENDPOINT;
// const embedApiVersion = process.env.AZURE_OPEN_AI_EMBEDDING_API_VERSION;

// // embedding Client
// const embeddingClient = new AzureOpenAI({
//   apiKey: embedApiKey,
//   endpoint: embedEndpoint,
//   apiVersion: embedApiVersion,
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

// export const callTools = async () => {
//   // Wrap the Azure OpenAI client for LangSmith tracing
//   const client = wrapOpenAI(
//     new AzureOpenAI({
//       apiKey,
//       baseURL: endpoint,
//       apiVersion,
//     })
//   );

//   // Define a tool for basic arithmetic
//   const multiplyTool = tool(
//     ({ a, b }: { a: number; b: number }) => {
//       return a * b;
//     },
//     {
//       name: "multiplyTool",
//       description: "Multiplies two numbers",
//       schema: z.object({
//         a: z.number(),
//         b: z.number(),
//       }),
//     }
//   );

//   // Define another tool (e.g., a text reversal tool)
//   const reverseTextTool = tool(
//     ({ text }: { text: string }) => {
//       return text.split("").reverse().join("");
//     },
//     {
//       name: "reverseTextTool",
//       description: "Reverses the input text",
//       schema: z.object({
//         text: z.string(),
//       }),
//     }
//   );

//   // Auto-trace this function
//   const pipeline = traceable(async (user_input: string) => {
//     // Simulate an LLM response that uses the tools
//     if (user_input.startsWith("multiply")) {
//       const args = { a: 5, b: 10 }; // Example arguments
//       const result = await multiplyTool.invoke(args);
//       return `Multiplication result: ${result}`;
//     } else if (user_input.startsWith("reverse")) {
//       const args = { text: "Hello, LangChain!" };
//       const result = await reverseTextTool.invoke(args);
//       return `Reversed text: ${result}`;
//     } else {
//       // Default LLM response
//       const result = await client.chat.completions.create({
//         messages: [{ role: "user", content: user_input }],
//         model: "gpt-4o-mini",
//       });
//       return result.choices[0].message.content;
//     }
//   });

//   // Call the pipeline with user input
//   let result = await pipeline("reverse text");
//   console.log(result); // Output: Reversed text: !niahCgnaL ,olleH

//   result = await pipeline("multiply 5 and 10");
//   console.log(result);
// };
