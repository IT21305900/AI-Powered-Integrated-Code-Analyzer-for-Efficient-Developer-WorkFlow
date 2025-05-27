"use server";
import simpleGit from "simple-git";
import fs from "fs";
import path from "path";
import Repo from "@/lib/db/repo.model";
import { ProjectStructure } from "./types";
import dbConnect from "./db/db";
import { revalidatePath } from "next/cache";

export const clonRepository = async (formData: FormData) => {
  const link = formData.get("link") as string;
  if (!link) {
    throw new Error("Repository link is required.");
  }

  console.log("Github Clone Initiate");

  try {
    // Ensure DB connection
    await dbConnect();
    // Define the folder to save the cloned repository
    const serverFolder = path.resolve(process.cwd(), "repositories");


    // Ensure the folder exists
    if (!fs.existsSync(serverFolder)) {
      fs.mkdirSync(serverFolder, { recursive: true });
    }

    // Initialize simple-git
    const git = simpleGit();

    // Extract the repository name from the URL
    const repoName = link.split("/").pop()?.replace(".git", "") || "repository";

    // Target folder for the cloned repository
    const targetFolder = path.join(serverFolder, repoName);

    // ❗ Delete the folder if it already exists
    if (fs.existsSync(targetFolder)) {
      console.log(`Removing existing folder: ${targetFolder}`);
      fs.rmSync(targetFolder, { recursive: true, force: true });
    }

    // Clone the repository
    await git.clone(link, targetFolder);

    // Save the repository information to the database
    const repo = new Repo({
      name: repoName,
      link: link,
      updated: new Date(),
    });

    await repo.save();

    revalidatePath("/");

    console.log("Github Clone Process End");
    console.log(`Repository cloned successfully to ${targetFolder}`);
    return { success: true };
  } catch (error) {
    console.error("Error cloning repository:", error);
    throw new Error("Failed to clone the repository.");
  }
};

export const buildProjectStructure = async (
  dir: string
): Promise<ProjectStructure> => {
  try {
    const stat = fs.lstatSync(dir);

    if (stat.isDirectory()) {
      const children: ProjectStructure[] = [];
      const files = fs.readdirSync(dir);

      // Traverse through all files and directories inside the current directory
      for (const file of files) {
        const childPath = path.join(dir, file);
        const childStat = fs.lstatSync(childPath);

        if (childStat.isDirectory()) {
          // If it's a directory, recursively process it
          children.push(await buildProjectStructure(childPath));
        } else {
          // If it's a file, just add it to the children
          const content = fs.readFileSync(childPath, "utf-8");
          children.push({
            name: path.basename(childPath),
            type: "file",
            content,
          });
        }
      }

      return {
        name: path.basename(dir),
        type: "directory",
        children,
      };
    } else {
      // Handle case where the item is a file (it won't be reached with the current code logic, but it's here for completeness)
      const content = fs.existsSync(dir) ? fs.readFileSync(dir, "utf-8") : "";
      return {
        name: path.basename(dir),
        type: "file",
        content,
      };
    }
  } catch (error) {
    console.error(error);
    throw new Error("Failed to build the project structure.");
  }
};
