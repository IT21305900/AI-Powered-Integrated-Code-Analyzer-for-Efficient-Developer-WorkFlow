// models/Pipeline.js
import mongoose from "mongoose";

const DocumentPipelineSchema = new mongoose.Schema({
    repository: {
        type: String,
        required: true,
    },
    analyze: {
        type: String,
        default: "idle"
    },
    embedding: {
        type: String,
        default: "idle"
    },
    generate: {
        type: String,
        default: "idle"
    },
    error: {
        type: String,
        default: "idle"
    },
    created: {
        type: Date,
        default: Date.now,
    },
    updated: {
        type: Date,
        default: Date.now,
    },
});

// Ensure only one pipeline per repository
DocumentPipelineSchema.index({ repository: 1 }, { unique: true });

export default mongoose.models?.Pipeline || mongoose.model("Pipeline", DocumentPipelineSchema);