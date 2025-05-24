const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');  // Import cors
const app = express();
const port = 5000;

const uri = 'mongodb+srv://root:root12345@cluster0.tn5vu.mongodb.net/code_analysis_db?retryWrites=true&w=majority'; // MongoDB URI

// Define a Schema and Model for your data
const codeSmellSchema = new mongoose.Schema({
  file: String,
  smell: String,
  suggestion: String,
  line_number: String,
  main_type: String
});

const CodeSmell = mongoose.model('CodeSmell', codeSmellSchema, 'analysis_results'); // Specify collection name

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Use CORS middleware to allow cross-origin requests
app.use(cors({
  origin: '*', // Allow requests from this frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed methods
}));

app.get('/codesmelldata', async (req, res) => {
  try {
    const documents = await CodeSmell.find(); // Query the 'analysis_results' collection
    res.json(documents); // Send data as JSON response
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error retrieving data');
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
