const mongoose = require("mongoose");

const CodeSmellSchema = new mongoose.Schema({
  type: { type: String, required: true }, // "Implementation" or "Design"
  page: { type: String, required: true }, // File where smell was found
  line: { type: String, required: true }, // Line number
  feedback: { type: String, required: true }, // Explanation of the smell
});

module.exports = mongoose.model("CodeSmell", CodeSmellSchema);
