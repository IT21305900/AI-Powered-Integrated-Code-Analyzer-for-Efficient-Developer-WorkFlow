"use server"
import Pipeline from "@/lib/db/documentstats.model";
import dbConnect from "@/lib/db/db";

export async function updateDocumentPipelineStats(
    repository: string,
    step: "analyze" | "embedding" | "generate",
    status: "idle" | "running" | "completed" | "error",
    errorMessage?: string
) {
    try {
        await dbConnect();

        // Build the update object to match your schema
        const updateFields: any = {
            updated: new Date()
        };


        // Update the specific step field in your schema
        updateFields[step] = status;

        // Handle error messages
        if (status === "error" && errorMessage) {
            updateFields.error = errorMessage;
        } else if (status === "running" || status === "completed") {
            // Clear error when step starts running or completes
            updateFields.error = "idle";
        }

        const result = await Pipeline.findOneAndUpdate(
            { repository: repository },
            updateFields,
            { upsert: true, new: true }
        );

        console.log("Test Runn")
        console.log(status)
        console.log(result)


        console.log(`Pipeline ${repository} - ${step}: ${status}`);
        return result;

    } catch (error: any) {
        console.error("Error updating document pipeline stats:", error);
        throw error;
    }
}


export async function resetPipeline(repository: string) {
    try {
        await dbConnect();

        const result = await Pipeline.findOneAndUpdate(
            { repository: repository },
            {
                analyze: 'idle',
                embedding: 'idle',
                generate: 'idle',
                error: 'idle',
                updated: new Date()
            },
            { upsert: true, new: true }
        );

        console.log(`Pipeline ${repository} - Reset to idle`);
        return result;

    } catch (error: any) {
        console.error("Error resetting pipeline:", error);
        throw error;
    }
}

export async function getPipelineStats(repository: string) {
    try {
        console.log(repository)

        await dbConnect()

        console.log("Fetching pipeline stats for repository:", repository);
        const result = await Pipeline.findOne({ repository: repository }, { _id: 0 }).lean()

        if (!result) {
            retrun({
                analyze: "idle",
                embedding: "idle",
                generate: "idle",
                error: "idle",
                created: new Date(),
                updated: new Date()
            })
        }

        return result;
    } catch (error: any) {
        console.error("Error fetching pipeline stats:", error);
    }
}

function retrun(arg0: { analyze: string; embedding: string; generate: string; error: string; created: Date; updated: Date; }) {
    throw new Error("Function not implemented.");
}
