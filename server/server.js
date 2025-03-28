const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit'); 


const envPath = path.resolve(__dirname, '.env');
console.log('Looking for .env file at:', envPath);
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found at', envPath);
  console.error('Please create a .env file with the required environment variables.');
  process.exit(1);
}

require('dotenv').config({ path: envPath });

const app = express();

app.use(cors()); //Allows all origins (for development)
app.use(express.json());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, //15 minutes
  max: 100, //100 requests per IP
  message: 'Too many requests from this IP, please try again after 15 minutes.'
}));

console.log('Environment variables loaded:');
console.log('MONGO_URI:', process.env.MONGO_URI ? process.env.MONGO_URI : 'Not set');
console.log('SCORE_SUBMIT_ENDPOINT:', process.env.SCORE_SUBMIT_ENDPOINT);
console.log('SCORE_FETCH_ENDPOINT:', process.env.SCORE_FETCH_ENDPOINT);
console.log('MONGO_COLLECTION_NAME:', process.env.MONGO_COLLECTION_NAME);
console.log('PORT:', process.env.PORT);
console.log('API_KEY:', process.env.API_KEY ? 'Set' : 'Not set');

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI is not defined in the .env file. Please set it and restart the server.');
}

if (!process.env.MONGO_COLLECTION_NAME) {
  throw new Error('MONGO_COLLECTION_NAME is not defined in the .env file. Please set it and restart the server.');
}

if (!process.env.API_KEY) {
  throw new Error('API_KEY is not defined in the .env file. Please set it and restart the server.');
}

const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }
  next();
};

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB Atlas connected successfully'))
  .catch(err => console.error('MongoDB Atlas connection error:', err));

const Score = require('./models/Score');

const SCORE_SUBMIT_ENDPOINT = process.env.SCORE_SUBMIT_ENDPOINT || '/submit-score';
const SCORE_FETCH_ENDPOINT = process.env.SCORE_FETCH_ENDPOINT || '/fetch-scores';

console.log('Using SCORE_SUBMIT_ENDPOINT:', SCORE_SUBMIT_ENDPOINT);
console.log('Using SCORE_FETCH_ENDPOINT:', SCORE_FETCH_ENDPOINT);

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.post('/proxy/submit-score', async (req, res) => {
  try {
    const response = await fetch(`http://localhost:3000${process.env.SCORE_SUBMIT_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.API_KEY
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Error in proxy/submit-score:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/proxy/fetch-scores', async (req, res) => {
  try {
    const response = await fetch(`http://localhost:3000${process.env.SCORE_FETCH_ENDPOINT}`, {
      headers: {
        'x-api-key': process.env.API_KEY
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Error in proxy/fetch-scores:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post(SCORE_SUBMIT_ENDPOINT, authenticate, async (req, res) => {
  console.log('POST request received at:', SCORE_SUBMIT_ENDPOINT);
  console.log('Request body:', req.body);
  const { name, score, mode } = req.body;

  if (!name || typeof name !== 'string' || name.length > 32) {
    return res.status(400).json({ error: 'Invalid name: Must be a string with max length 32' });
  }
  if (!Number.isInteger(score) || score < 0 || score > 2000000000) {
    return res.status(400).json({ error: 'Invalid score: Must be an integer between 0 and 2,000,000,000' });
  }
  if (!['SIMPLE', 'TIMED', 'EXPLOSIONS'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode: Must be SIMPLE, TIMED, or EXPLOSIONS' });
  }

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

app.get(SCORE_FETCH_ENDPOINT, authenticate, async (req, res) => {
  console.log('GET request received at:', SCORE_FETCH_ENDPOINT);
  try {
    const simpleScores = await Score.find({ mode: 'SIMPLE' })
      .sort({ score: -1 })
      .limit(5)
      .select('-__v');
    const timedScores = await Score.find({ mode: 'TIMED' })
      .sort({ score: -1 })
      .limit(5)
      .select('-__v');
    const explosionsScores = await Score.find({ mode: 'EXPLOSIONS' })
      .sort({ score: -1 })
      .limit(5)
      .select('-__v');

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