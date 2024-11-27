"use server";
import { AzureOpenAI } from "openai";
import { traceable } from "langsmith/traceable";
import { wrapOpenAI } from "langsmith/wrappers";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const apiKey = process.env.AZURE_OPEN_AI_API_KEY;
const endpoint = process.env.AZURE_OPEN_AI_ENDPOINT;
const apiVersion = process.env.AZURE_OPEN_AI_API_VERSION;

export const callTools = async () => {
  // Wrap the Azure OpenAI client for LangSmith tracing
  const client = wrapOpenAI(
    new AzureOpenAI({
      apiKey,
      baseURL: endpoint,
      apiVersion,
    })
  );

  // Define a tool for basic arithmetic
  const multiplyTool = tool(
    ({ a, b }: { a: number; b: number }) => {
      return a * b;
    },
    {
      name: "multiplyTool",
      description: "Multiplies two numbers",
      schema: z.object({
        a: z.number(),
        b: z.number(),
      }),
    }
  );

  // Define another tool (e.g., a text reversal tool)
  const reverseTextTool = tool(
    ({ text }: { text: string }) => {
      return text.split("").reverse().join("");
    },
    {
      name: "reverseTextTool",
      description: "Reverses the input text",
      schema: z.object({
        text: z.string(),
      }),
    }
  );

  // Auto-trace this function
  const pipeline = traceable(async (user_input: string) => {
    // Simulate an LLM response that uses the tools
    if (user_input.startsWith("multiply")) {
      const args = { a: 5, b: 10 }; // Example arguments
      const result = await multiplyTool.invoke(args);
      return `Multiplication result: ${result}`;

    } else if (user_input.startsWith("reverse")) {
      const args = { text: "Hello, LangChain!" };
      const result = await reverseTextTool.invoke(args);
      return `Reversed text: ${result}`;
      
    } else {
      // Default LLM response
      const result = await client.chat.completions.create({
        messages: [{ role: "user", content: user_input }],
        model: "gpt-4o-mini",
      });
      return result.choices[0].message.content;
    }
  });

  // Call the pipeline with user input
  let result = await pipeline("reverse text");
  console.log(result); // Output: Reversed text: !niahCgnaL ,olleH

  result = await pipeline("multiply 5 and 10");
  console.log(result);
};
