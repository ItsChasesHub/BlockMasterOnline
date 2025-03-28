const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Debug: Check if the .env file exists
const envPath = path.resolve(__dirname, '.env');
console.log('Looking for .env file at:', envPath);
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found at', envPath);
  console.error('Please create a .env file with the required environment variables.');
  process.exit(1);
}

// Load the .env file
require('dotenv').config({ path: envPath });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());


// Debug: Log all environment variables to confirm .env is loaded
console.log('Environment variables loaded:');
console.log('MONGO_URI:', process.env.MONGO_URI ? process.env.MONGO_URI : 'Not set');
console.log('SCORE_SUBMIT_ENDPOINT:', process.env.SCORE_SUBMIT_ENDPOINT);
console.log('SCORE_FETCH_ENDPOINT:', process.env.SCORE_FETCH_ENDPOINT);
console.log('MONGO_COLLECTION_NAME:', process.env.MONGO_COLLECTION_NAME);
console.log('PORT:', process.env.PORT);

// Check if MONGO_URI is undefined and throw an error if it is
if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI is not defined in the .env file. Please set it and restart the server.');
}

// Check if MONGO_COLLECTION_NAME is undefined and throw an error if it is
if (!process.env.MONGO_COLLECTION_NAME) {
  throw new Error('MONGO_COLLECTION_NAME is not defined in the .env file. Please set it and restart the server.');
}

// MongoDB Atlas Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB Atlas connected successfully'))
  .catch(err => console.error('MongoDB Atlas connection error:', err));

// Score Model
const Score = require('./models/Score');

const SCORE_SUBMIT_ENDPOINT = process.env.SCORE_SUBMIT_ENDPOINT || '/submit-score';
const SCORE_FETCH_ENDPOINT = process.env.SCORE_FETCH_ENDPOINT || '/fetch-scores';

// Debug: Log the endpoints being used
console.log('Using SCORE_SUBMIT_ENDPOINT:', SCORE_SUBMIT_ENDPOINT);
console.log('Using SCORE_FETCH_ENDPOINT:', SCORE_FETCH_ENDPOINT);

// Test route to confirm server is running
app.get('/', (req, res) => {
  res.send('Server is running');
});

// API Routes
app.post(SCORE_SUBMIT_ENDPOINT, async (req, res) => {
  console.log('POST request received at:', SCORE_SUBMIT_ENDPOINT);
  console.log('Request body:', req.body);
  const { name, score, mode } = req.body;
  try {
    const newScore = new Score({ name, score, mode });
    const savedScore = await newScore.save();
    console.log('Score saved:', savedScore);
    const responseData = savedScore.toObject();
    delete responseData.__v;
    res.status(201).json(responseData);
  } catch (err) {
    console.error('Error saving score:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.get(SCORE_FETCH_ENDPOINT, async (req, res) => {
  console.log('GET request received at:', SCORE_FETCH_ENDPOINT);
  try {
    const simpleScores = await Score.find({ mode: 'SIMPLE' })
      .sort({ score: -1 })
      .limit(5);
    const timedScores = await Score.find({ mode: 'TIMED' })
      .sort({ score: -1 })
      .limit(5);
    const explosionsScores = await Score.find({ mode: 'EXPLOSIONS' })
      .sort({ score: -1 })
      .limit(5);

    console.log('Fetched scores:', { simple: simpleScores, timed: timedScores, explosions: explosionsScores });
    res.json({
      simple: simpleScores,
      timed: timedScores,
      explosions: explosionsScores,
    });
  } catch (err) {
    console.error('Error fetching scores:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));