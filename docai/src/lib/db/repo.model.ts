import mongoose from "mongoose";

const RepoSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
  },
  link: {
    type: String,
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

export default mongoose.models?.Repo || mongoose.model("Repo", RepoSchema);
