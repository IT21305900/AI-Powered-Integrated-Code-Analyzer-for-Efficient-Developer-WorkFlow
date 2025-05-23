import fs from "fs";
import path from "path";
import { ChromaClient } from "chromadb";
import { AzureOpenAI } from "openai";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Get environment variables
const apiKey = process.env.AZURE_OPEN_AI_API_KEY!;
const endpoint = process.env.AZURE_OPEN_AI_ENDPOINT;
const apiVersion = process.env.AZURE_OPEN_AI_API_VERSION;


// Validate environment variables
if (!apiKey || !endpoint || !apiVersion) {
  throw new Error(
    "Missing required Azure OpenAI environment variables: AZURE_OPEN_AI_API_KEY, AZURE_OPEN_AI_ENDPOINT, AZURE_OPEN_AI_API_VERSION"
  );
}


// Initialize Chroma and Azure OpenAI
const chromaClient = new ChromaClient();
const openAIClient = new AzureOpenAI({
  apiVersion,
  apiKey,
  endpoint,
});

const segmentsFolder = path.resolve(process.cwd(), "segments");

// Function to embed a JSON file
const embedJsonFile = async (filePath: string) => {
  const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // Create a meaningful text representation
  const text = `
    File Path: ${jsonData.filePath}
    Code Snippet: ${jsonData.code.substring(0, 500)}...
    Components: ${jsonData.components.join(", ")}
    Dependencies: ${jsonData.dependencies.join(", ")}
    File Role: ${jsonData.fileRole}
    Route Path: ${jsonData.routePath}
  `;

  // Generate embedding using Azure OpenAI API

  const response = await openAIClient.embeddings.create(
    // @ts-ignore
    "text-embedding-ada-002",
    {
      body: text,
    }
  );

  return {
    id: jsonData.filePath,
    embedding: response.data[0].embedding,
    metadata: jsonData,
  };
};

// Function to embed all JSON files in the "segments" folder
const embedAllJsonFiles = async () => {
  const files = fs
    .readdirSync(segmentsFolder)
    .filter((file) => file.endsWith(".json"));

  // Create the collection in Chroma
  const collection = await chromaClient.getOrCreateCollection({
    name: "project-analysis",
  });

  for (const file of files) {
    const filePath = path.join(segmentsFolder, file);
    const { id, embedding, metadata } = await embedJsonFile(filePath);

    // Add embedding to Chroma collection
    await collection.add({
      ids: [id],
      embeddings: [embedding],
      metadatas: [metadata],
    });

    console.log(`Embedded and added: ${file}`);
  }
};

// API route handler for embedding
export const POST = async (req: NextRequest) => {
  if (req.method === "POST") {
    console.log("Called the API");
    try {
      // Call the function to embed all JSON files
      await embedAllJsonFiles();
      // res.status(200).json({ message: "Successfully embedded all files!" });
    } catch (error) {
      // console.error("Error during embedding:", error);
      // res.status(500).json({ error: "Failed to embed files" });
    }
  } else {
    // Only allow POST requests
    // res.status(405).json({ error: "Method Not Allowed" });
  }
};
