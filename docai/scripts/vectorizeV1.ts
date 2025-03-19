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

  const file = `
  File Path: ${relativePath}
  Code: ${jsonData.code}
  Dependencies: ${jsonData.dependencies.join(", ")}
  File Role: ${jsonData.fileRole}
`;

  console.log("File");
  console.log(file);

  try {
    const response = await embeddingClient.embeddings.create({
      model: "text-embedding-ada-002",
      input: [file],
    });

    const data = {
      id: relativePath,
      embedding: response.data[0].embedding,
      code: jsonData.code,
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
    console.log(`Collection "${collectionName}" exists. Dropping it...`);
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
    // @ts-ignore
    const response: {
      id: string;
      code: string;
      embedding: number[];
      metadata: any;
    } = await embedJsonFile(filePath);

    console.log("response");
    console.log(response);

    // Add embedding to Chroma
    await collection.add({
      ids: [response.id],
      embeddings: [response.embedding],
      documents: [response.code],
      metadatas: [response.metadata],
    });

    console.log(`Embedded and added: ${file}`);
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
