const express = require("express");
const axios = require("axios"); // To communicate with Flask API
const CodeSmell = require("../models/CodeSmell");

const router = express.Router();

// Fetch all code smells
router.get("/", async (req, res) => {
  try {
    const smells = await CodeSmell.find();
    res.json(smells);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new code smell with AI analysis
router.post("/", async (req, res) => {
  try {
    const { type, page, line, feedback, features } = req.body; // 'features' will be used for AI detection

    // Send 'features' to Flask API for analysis
    const flaskResponse = await axios.post("http://localhost:5001/predict", { features });

    // Extract prediction from Flask response
    const aiFeedback = flaskResponse.data.prediction || "Unknown issue detected";

    // Save the detected smell in MongoDB
    const newSmell = new CodeSmell({
      type: type || "Detected Smell", // Use given type or default
      page,
      line,
      feedback: aiFeedback, // Store AI-generated feedback
    });

    await newSmell.save();
    res.status(201).json(newSmell);
  } catch (err) {
    console.error("Error in processing request:", err.message);
    res.status(500).json({ error: "Failed to analyze code smell" });
  }
});

module.exports = router;
