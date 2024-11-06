"use server";
import fs from "fs";
import path from "path";
import { ChromaClient } from "chromadb";
import { AzureOpenAI } from "openai";
import axios from "axios";

const apiKey = process.env.AZURE_OPEN_AI_API_KEY;
const endpoint = process.env.AZURE_OPEN_AI_ENDPOINT;
const apiVersion = process.env.AZURE_OPEN_AI_API_VERSION;

// Initialize Chroma and Azure OpenAI
const chromaClient = new ChromaClient({ path: "http://localhost:8081" });

const openAIClient = new AzureOpenAI({
  apiKey,
  endpoint,
  apiVersion,
});

const segmentsFolder = path.resolve(process.cwd(), "segments");

// Function to embed JSON file
const embedJsonFile = async (filePath: string) => {
  const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // Create a meaningful text representation
  const file = `
    File Path: ${jsonData.filePath}
    Code Snippet: ${jsonData.code}
    Components: ${jsonData.components.join(", ")}
    Dependencies: ${jsonData.dependencies.join(", ")}
    File Role: ${jsonData.fileRole}
    Route Path: ${jsonData.routePath}
  `;

  // console.log("File Before Embedding");
  // console.log(file);

  // Generate embedding
  try {
  } catch (error) {
    console.error(`Error generating embedding`);
    console.log(error);
  }
};

// Batch embed all JSON files in the "segments" folder
export const embedAllJsonFiles = async () => {
  console.log(`Embedded and added`);
  checkEmbeddings();
  const files = fs
    .readdirSync(segmentsFolder)
    .filter((file) => file.endsWith(".json"));

  // Create the collection
};
