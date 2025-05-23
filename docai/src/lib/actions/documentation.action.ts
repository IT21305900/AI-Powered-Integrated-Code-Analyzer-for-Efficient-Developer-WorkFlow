"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";

/**
 * Server action to save documentation content to a markdown file
 *
 * @param repository The repository name (used for file path)
 * @param content The markdown content to save
 * @returns Object indicating success or failure
 */
export async function saveDocumentation(
  repository: string,
  content: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate inputs
    if (!repository) {
      throw new Error("Repository name is required");
    }

    if (!content) {
      throw new Error("Documentation content cannot be empty");
    }

    // Define the file path
    const folderPath = path.join("./public", repository);
    const filePath = path.join(folderPath, `${repository}.md`);

    // Ensure the folder exists
    try {
      await fs.access(folderPath);
    } catch {
      // Create the folder if it doesn't exist
      await fs.mkdir(folderPath, { recursive: true });
    }

    // Create a backup of the existing file
    try {
      const existingContent = await fs.readFile(filePath, "utf-8");
      const backupPath = path.join(
        folderPath,
        `${repository}.backup.${Date.now()}.md`
      );
      await fs.writeFile(backupPath, existingContent, "utf-8");
    } catch (error) {
      // If there's no existing file, we don't need to create a backup
      console.log("No existing file to backup, creating new file");
    }

    // Write the new content to the file
    await fs.writeFile(filePath, content, "utf-8");

    // Revalidate the path to ensure fresh content is served
    revalidatePath(`/${repository}`);

    return {
      success: true,
      message: "Documentation saved successfully",
    };
  } catch (error) {
    console.error("Error saving documentation:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to save documentation",
    };
  }
}

/**
 * Server action to get documentation content
 *
 * @param repository The repository name (used for file path)
 * @returns The documentation content or error message
 */
export async function getDocumentation(
  repository: string
): Promise<{ success: boolean; content?: string; message?: string }> {
  try {
    // Validate inputs
    if (!repository) {
      throw new Error("Repository name is required");
    }

    // Define the file path
    const filePath = path.join("./public", repository, `${repository}.md`);

    // Read the file content
    const content = await fs.readFile(filePath, "utf-8");

    return {
      success: true,
      content,
    };
  } catch (error) {
    console.error("Error reading documentation:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to read documentation",
    };
  }
}

/**
 * Server action to list available documentation backups
 *
 * @param repository The repository name
 * @returns List of backup files with timestamps
 */
export async function listDocumentationBackups(repository: string): Promise<{
  success: boolean;
  backups?: { name: string; timestamp: number }[];
  message?: string;
}> {
  try {
    // Validate inputs
    if (!repository) {
      throw new Error("Repository name is required");
    }

    // Define the folder path
    const folderPath = path.join("./public", repository);

    // Get all files in the folder
    const files = await fs.readdir(folderPath);

    // Filter for backup files and extract timestamps
    const backupPattern = new RegExp(`${repository}\\.backup\\.(\\d+)\\.md$`);
    const backups = files
      .filter((file) => backupPattern.test(file))
      .map((file) => {
        const match = file.match(backupPattern);
        const timestamp = match ? parseInt(match[1]) : 0;
        return {
          name: file,
          timestamp,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp descending

    return {
      success: true,
      backups,
    };
  } catch (error) {
    console.error("Error listing documentation backups:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to list documentation backups",
    };
  }
}

/**
 * Server action to restore a documentation backup
 *
 * @param repository The repository name
 * @param backupFileName The backup file name to restore
 * @returns Object indicating success or failure
 */
export async function restoreDocumentationBackup(
  repository: string,
  backupFileName: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate inputs
    if (!repository) {
      throw new Error("Repository name is required");
    }

    if (!backupFileName) {
      throw new Error("Backup file name is required");
    }

    // Define the file paths
    const folderPath = path.join("./public", repository);
    const backupPath = path.join(folderPath, backupFileName);
    const filePath = path.join(folderPath, `${repository}.md`);

    // Read the backup content
    const backupContent = await fs.readFile(backupPath, "utf-8");

    // Create a backup of the current file before restoring
    try {
      const currentContent = await fs.readFile(filePath, "utf-8");
      const currentBackupPath = path.join(
        folderPath,
        `${repository}.backup.${Date.now()}.md`
      );
      await fs.writeFile(currentBackupPath, currentContent, "utf-8");
    } catch (error) {
      // If there's no current file, we don't need to create a backup
      console.log("No current file to backup before restore");
    }

    // Write the backup content to the main file
    await fs.writeFile(filePath, backupContent, "utf-8");

    // Revalidate the path to ensure fresh content is served
    revalidatePath(`/${repository}`);

    return {
      success: true,
      message: "Backup restored successfully",
    };
  } catch (error) {
    console.error("Error restoring documentation backup:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to restore documentation backup",
    };
  }
}
