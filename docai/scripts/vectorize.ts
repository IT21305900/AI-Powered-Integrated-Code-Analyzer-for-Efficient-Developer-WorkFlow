"use server";
import fs from "fs";
import path from "path";
import { ChromaClient } from "chromadb";
import { AzureOpenAI } from "openai";
import axios from "axios";

const apiKey = process.env.AZURE_OPEN_AI_EMBEDDING_API_KEY;
const endpoint = process.env.AZURE_OPEN_AI_EMBEDDING_ENDPOINT;
const apiVersion = process.env.AZURE_OPEN_AI_EMBEDDING_API_VERSION;

// Initialize Chroma and Azure OpenAI
const chromaClient = new ChromaClient({ path: "http://localhost:8081" });

const embeddingClient = new AzureOpenAI({
  apiKey: apiKey,
  endpoint: endpoint,
  apiVersion: apiVersion,
});

const segmentsFolder = path.resolve(process.cwd(), "segments");

// Function to embed JSON file
const embedJsonFile = async (filePath: string) => {
  const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // console.log("JSON DATA");
  // console.log(jsonData);

  const relativePath = path.relative(process.cwd(), jsonData.filePath);

  // Create a meaningful text representation
  // const file = `
  //   File Path: ${relativePath}
  //   Code: ${jsonData.code}
  //   Components: ${jsonData.components.join(", ")}
  //   Dependencies: ${jsonData.dependencies.join(", ")}
  //   File Role: ${jsonData.fileRole}
  //   Route Path: ${jsonData.routePath}
  // `;

  // Convert code to string if it's an object
  const codeContent =
    typeof jsonData.code === "object"
      ? JSON.stringify(jsonData.code, null, 2)
      : jsonData.code || jsonData.content || "";

  //embeedding
  const file = `
  File Path: ${relativePath}
  Code: ${jsonData.code}
  File Role: ${jsonData.fileRole}
`;

  if (jsonData.fileRole === "package.json") {
    console.log(jsonData);
  }

  try {
    const response = await embeddingClient.embeddings.create({
      model: "text-embedding-ada-002",
      input: [file],
    });

    const data = {
      id: relativePath,
      embedding: response.data[0].embedding,
      code:
        typeof codeContent === "string"
          ? codeContent
          : JSON.stringify(codeContent),
      metadata: jsonData,
    };

    return data;
  } catch (error) {
    console.error(`Error generating embedding`);
    console.log(error);
  }
};

// Batch embed all JSON files in the "segments" folder
export const embedAllJsonFiles = async (collectionName: string) => {
  const files = fs
    .readdirSync(segmentsFolder)
    .filter((file) => file.endsWith(".json"));

  // Check if the collection exists
  const existingCollections = await chromaClient.listCollections();
  const collectionExists = existingCollections.some(
    (collection) => collection.name === collectionName
  );

  if (collectionExists) {
    console.log(`Collection "${collectionName}" exists. Dropping it.`);
    await chromaClient.deleteCollection({ name: collectionName });
    console.log(`Collection "${collectionName}" deleted.`);
  }

  // Create a new collection
  const collection = await chromaClient.getOrCreateCollection({
    name: collectionName,
  });

  console.log(`Collection "${collectionName}" created.`);

  for (const file of files) {
    const filePath = path.join(segmentsFolder, file);

    try {
      // @ts-ignore
      const response: {
        id: string;
        code: string;
        embedding: number[];
        metadata: any;
      } = await embedJsonFile(filePath);

      console.log(response.metadata);

      // Add embedding to Chroma
      await collection.add({
        ids: [response.id],
        embeddings: [response.embedding],
        documents: [response.code],
        metadatas: [response.metadata],
      });
    } catch (error: any) {
      console.error(`Error processing file ${file}:`, error);
    }
  }
};

// const checkEmbeddings = async () => {
//   try {
//     // Retrieve the collection
//     const collection = await chromaClient.getCollection({
//       name: "project-analysis",
//     });

//     // Fetch all embeddings and metadata from the collection
//     const data = await collection.get(); // Fetches all ids, embeddings, and metadata

//     console.log("Collection Data:");
//     console.log(data); // Logs the complete collection data
//   } catch (error) {
//     console.error("Error retrieving embeddings:");
//     console.error(error);
//   }
// };

// Call the function to check the embeddings
// checkEmbeddings();

// // Enhanced vectorize.ts
// "use server";
// import fs from "fs";
// import path from "path";
// import { ChromaClient } from "chromadb";
// import { AzureOpenAI } from "openai";

// // Get environment variables
// const apiKey = process.env.AZURE_OPEN_AI_EMBEDDING_API_KEY;
// const endpoint = process.env.AZURE_OPEN_AI_EMBEDDING_ENDPOINT;
// const apiVersion = process.env.AZURE_OPEN_AI_EMBEDDING_API_VERSION;

// // Initialize Chroma and Azure OpenAI
// const chromaClient = new ChromaClient({ path: "http://localhost:8081" });

// const embeddingClient = new AzureOpenAI({
//   apiKey: apiKey,
//   endpoint: endpoint,
//   apiVersion: apiVersion,
// });

// const segmentsFolder = path.resolve(process.cwd(), "segments");

// // Prepare specific chunks for different file types
// const prepareChunks = (jsonData: any) => {
//   const chunks = [];
//   const {
//     filePath,
//     relativePath,
//     code,
//     fileRole,
//     routePath,
//     routeType,
//     dynamicParams,
//   } = jsonData;

//   // Base metadata for all chunks
//   const baseMetadata = {
//     filePath,
//     relativePath,
//     fileRole,
//     routePath: routePath || null,
//     routeType: routeType || null,
//     isDynamic: dynamicParams && dynamicParams.length > 0,
//     dynamicParams: dynamicParams || [],
//   };

//   // Create base file info chunk
//   const fileInfo = `
//     File Path: ${relativePath}
//     Role: ${fileRole}
//     ${routePath ? `Route Path: ${routePath}` : ""}
//     ${routeType ? `Route Type: ${routeType}` : ""}
//     ${
//       dynamicParams && dynamicParams.length > 0
//         ? `Dynamic Parameters: ${dynamicParams.join(", ")}`
//         : ""
//     }
//   `;

//   chunks.push({
//     id: `${relativePath}_info`,
//     text: fileInfo,
//     metadata: {
//       ...baseMetadata,
//       chunkType: "file_info",
//     },
//   });

//   // Create code chunk
//   chunks.push({
//     id: `${relativePath}_code`,
//     text: code,
//     metadata: {
//       ...baseMetadata,
//       chunkType: "code",
//     },
//   });

//   // If it's a route, create route-specific chunks
//   if (
//     fileRole === "route" ||
//     fileRole === "api" ||
//     fileRole === "legacy-route" ||
//     fileRole === "legacy-api"
//   ) {
//     const routeInfo = `
//       Route Path: ${routePath}
//       Route Type: ${routeType}
//       ${
//         dynamicParams && dynamicParams.length > 0
//           ? `Dynamic Parameters: ${dynamicParams.join(", ")}`
//           : ""
//       }
//       ${jsonData.isApiRoute ? "API Route: Yes" : ""}
//       ${
//         jsonData.serverActions && jsonData.serverActions.length > 0
//           ? `Server Actions: ${jsonData.serverActions
//               .map((sa: any) => sa.name)
//               .join(", ")}`
//           : ""
//       }
//     `;

//     chunks.push({
//       id: `${relativePath}_route`,
//       text: routeInfo,
//       metadata: {
//         ...baseMetadata,
//         chunkType: "route_info",
//         isApiRoute: jsonData.isApiRoute || false,
//         hasServerActions:
//           (jsonData.serverActions && jsonData.serverActions.length > 0) ||
//           false,
//       },
//     });
//   }

//   // If has components, create component-specific chunks
//   if (jsonData.components && jsonData.components.length > 0) {
//     const componentInfo = `
//       Components defined: ${jsonData.components.join(", ")}
//       Reusable Components: ${jsonData.reusableComponents?.join(", ") || "None"}
//       ${
//         jsonData.stateUsages && jsonData.stateUsages.length > 0
//           ? `State Variables: ${jsonData.stateUsages.join(", ")}`
//           : ""
//       }
//       ${
//         jsonData.hooks && jsonData.hooks.length > 0
//           ? `Hooks Used: ${jsonData.hooks.map((h: any) => h.type).join(", ")}`
//           : ""
//       }
//     `;

//     chunks.push({
//       id: `${relativePath}_components`,
//       text: componentInfo,
//       metadata: {
//         ...baseMetadata,
//         chunkType: "component_info",
//         componentCount: jsonData.components.length,
//         hasState:
//           (jsonData.stateUsages && jsonData.stateUsages.length > 0) || false,
//         hasHooks: (jsonData.hooks && jsonData.hooks.length > 0) || false,
//       },
//     });
//   }

//   return chunks;
// };

// // Function to embed chunks
// const embedChunks = async (chunks: any, collection: any) => {
//   for (const chunk of chunks) {
//     try {
//       const response = await embeddingClient.embeddings.create({
//         model: "text-embedding-ada-002",
//         input: [chunk.text],
//       });

//       await collection.add({
//         ids: [chunk.id],
//         embeddings: [response.data[0].embedding],
//         documents: [chunk.text],
//         metadatas: [chunk.metadata],
//       });

//       console.log(`Embedded: ${chunk.id}`);
//     } catch (error) {
//       console.error(`Error embedding chunk ${chunk.id}:`, error);
//     }
//   }
// };

// // Batch embed all JSON files in the "segments" folder
// export const embedAllJsonFiles = async (collectionName: string) => {
//   const files = fs
//     .readdirSync(segmentsFolder)
//     .filter((file) => file.endsWith(".json"));

//   // Check if the collection exists
//   const existingCollections = await chromaClient.listCollections();
//   const collectionExists = existingCollections.some(
//     (collection) => collection.name === collectionName
//   );

//   if (collectionExists) {
//     console.log(`Collection "${collectionName}" exists. Dropping it...`);
//     await chromaClient.deleteCollection({ name: collectionName });
//     console.log(`Collection "${collectionName}" deleted.`);
//   }

//   // Create a new collection
//   const collection = await chromaClient.getOrCreateCollection({
//     name: collectionName,
//   });

//   // Process all files
//   for (const file of files) {
//     const filePath = path.join(segmentsFolder, file);

//     try {
//       const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
//       console.log("Collection Name", jsonData);

//       const chunks = prepareChunks(jsonData);
//       await embedChunks(chunks, collection);
//     } catch (error) {
//       console.error(`Error processing file ${file}:`, error);
//     }
//   }

//   console.log("Embedding complete");
// };
