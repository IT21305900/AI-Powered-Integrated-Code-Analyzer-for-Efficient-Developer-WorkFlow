"use server";
import Repo from "@/lib/db/repo.model";
import dbConnect from "../db/db";

export const getRepositoryFolderNames = async () => {
  try {
    await dbConnect();
    const repos = await Repo.find().lean();

    return JSON.parse(JSON.stringify(repos));
  } catch (error) {
    console.error("Error reading repository directory:", error);
    return [];
  }
};
