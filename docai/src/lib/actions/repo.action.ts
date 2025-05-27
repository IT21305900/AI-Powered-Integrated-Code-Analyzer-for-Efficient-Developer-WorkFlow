"use server";
import Repo from "@/lib/db/repo.model";
import dbConnect from "../db/db";
import { revalidatePath } from 'next/cache'
import fs from 'fs/promises'
import path from 'path'
import exp from "constants";
import Pipeline from "@/lib/db/documentstats.model";


export type DeleteRepositoryResult = {
  success: boolean
  message: string
}

export type GetRepositoryResult = {
  success: boolean
  message: string
  data?: {
    _id: string
    name: string
    link: string
    created: Date
    updated: Date
  }
}

export const getRepositoryFolderNames = async () => {
  try {
    await dbConnect();
    const repos = await Repo.find().sort({ created: -1 }).lean();

    return JSON.parse(JSON.stringify(repos));
  } catch (error) {
    console.error("Error reading repository directory:", error);
    return [];
  }
};



export async function DeleteRepository(repoId: string): Promise<DeleteRepositoryResult> {
  try {
    if (!repoId) {
      return {
        success: false,
        message: 'Repository ID is required'
      }
    }

    // Ensure DB connection
    await dbConnect()

    // Find the repository in the database first
    const repo = await Repo.findOne({ name: repoId })

    if (!repo) {
      return {
        success: false,
        message: 'Repository not found'
      }
    }

    await Pipeline.findOneAndDelete({ repository: repo.name })

    // Delete from database
    await Repo.findOneAndDelete({ name: repoId })

    // Delete folder from filesystem
    const repoPath = path.join(process.cwd(), 'repositories', repo.name)

    try {
      await fs.access(repoPath)
      await fs.rm(repoPath, { recursive: true, force: true })
      console.log(`Repository folder deleted: ${repoPath}`)
    } catch (error) {
      // Folder doesn't exist or already deleted
      console.warn(`Repository folder not found: ${repoPath}`)
    }

    // Revalidate the repositories page to refresh the data
    revalidatePath('/ide')
    revalidatePath('/')

    return {
      success: true,
      message: `Repository "${repoId}" deleted successfully`
    }
  } catch (error) {
    console.error('Error deleting repository:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete repository'
    }
  }
}


// Get single repository by name
export async function GetRepositoryByName(repoName: string): Promise<GetRepositoryResult> {
  try {
    if (!repoName) {
      return {
        success: false,
        message: 'Repository name is required'
      }
    }

    // Ensure DB connection
    await dbConnect()

    // Find the repository in the database
    const repo = await Repo.findOne({ name: repoName })

    if (!repo) {
      return {
        success: false,
        message: 'Repository not found'
      }
    }

    return {
      success: true,
      message: 'Repository found successfully',
      data: {
        _id: repo._id.toString(),
        name: repo.name,
        link: repo.link,
        created: repo.created,
        updated: repo.updated
      }
    }
  } catch (error) {
    console.error('Error fetching repository:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch repository'
    }
  }
}