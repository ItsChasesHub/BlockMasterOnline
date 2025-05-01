const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const sanitize = require('mongo-sanitize');
const axios = require('axios');

require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client', 'blockmaster.html'));
});

app.use(cors());
app.use(express.json());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many requests from this IP, please try again after 15 minutes.'
}));

console.log('Environment variables loaded:');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Set' : 'Not set');
console.log('SCORE_SUBMIT_ENDPOINT:', process.env.SCORE_SUBMIT_ENDPOINT || 'Not set');
console.log('SCORE_FETCH_ENDPOINT:', process.env.SCORE_FETCH_ENDPOINT || 'Not set');
console.log('MONGO_COLLECTION_NAME:', process.env.MONGO_COLLECTION_NAME || 'Not set');
console.log('PORT:', process.env.PORT || 'Not set');
console.log('API_KEY:', process.env.API_KEY ? 'Set' : 'Not set');
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'Set' : 'Not set');
console.log('TELEGRAM_CHAT_ID:', process.env.TELEGRAM_CHAT_ID ? 'Set' : 'Not set');

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI is not defined. Please set it in Render environment variables.');
}
if (!process.env.MONGO_COLLECTION_NAME) {
  throw new Error('MONGO_COLLECTION_NAME is not defined. Please set it in Render environment variables.');
}
if (!process.env.API_KEY) {
  throw new Error('API_KEY is not defined. Please set it in Render environment variables.');
}
if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not defined.');
if (!process.env.TELEGRAM_CHAT_ID) throw new Error('TELEGRAM_CHAT_ID is not defined.');

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.RENDER_EXTERNAL_URL || `https://blockmasteronline.onrender.com`;

const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }
  next();
};

const sendTelegramNotification = async (message) => {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const response = await axios.post(url, {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
    });
    console.log('Telegram notification sent successfully');
    return response.data;
  } catch (err) {
    console.error('Error sending Telegram notification');
    throw err;
  }
};

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('MongoDB Atlas connected successfully'))
  .catch(err => {
    console.error('MongoDB Atlas connection error');
    process.exit(1);
  });

const Score = require('./models/Score');

const SCORE_SUBMIT_ENDPOINT = process.env.SCORE_SUBMIT_ENDPOINT || '/submit-score';
const SCORE_FETCH_ENDPOINT = process.env.SCORE_FETCH_ENDPOINT || '/fetch-scores';

console.log('Using SCORE_SUBMIT_ENDPOINT:', SCORE_SUBMIT_ENDPOINT);
console.log('Using SCORE_FETCH_ENDPOINT:', SCORE_FETCH_ENDPOINT);
console.log('Using BASE_URL:', BASE_URL);

app.post('/proxy/submit-score', authenticate, [
  body('name')
    .isString().withMessage('Name must be a string')
    .trim()
    .isLength({ max: 16 }).withMessage('Name must be at most 16 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Name can only contain alphanumeric characters, hyphens, and underscores')
    .customSanitizer(value => sanitize(value)),
  body('score')
    .isInt({ min: 0, max: 2147483647 }).withMessage('Score must be an integer between 0 and 2,147,483,647'),
  body('multiplier')
    .isInt({ min: 1, max: 9999 }).withMessage('Multiplier must be an integer between 1 and 9999'),
  body('mode')
    .isIn(['SIMPLE', 'TIMED', 'EXPLOSIONS', 'SLIDERS']).withMessage('Mode must be SIMPLE, TIMED, EXPLOSIONS, or SLIDERS'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('Validation errors in /proxy/submit-score');
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const response = await fetch(`${BASE_URL}${SCORE_SUBMIT_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.API_KEY
      },
      body: JSON.stringify(req.body)
    });
    if (!response.ok) {
      throw new Error(`Submit score failed with status ${response.status}`);
    }
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Error in proxy/submit-score');
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/proxy/fetch-scores', authenticate, async (req, res) => {
  try {
    const response = await fetch(`${BASE_URL}${SCORE_FETCH_ENDPOINT}`, {
      headers: {
        'x-api-key': process.env.API_KEY
      }
    });
    if (!response.ok) {
      throw new Error(`Fetch scores failed with status ${response.status}`);
    }
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Error in proxy/fetch-scores');
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/client/submit-score', [
  body('name').isString().trim().isLength({ max: 16 }).matches(/^[a-zA-Z0-9_-]+$/).customSanitizer(sanitize),
  body('score').isInt({ min: 0, max: 2147483647 }),
  body('multiplier').isInt({ min: 1, max: 9999 }),
  body('mode').isIn(['SIMPLE', 'TIMED', 'EXPLOSIONS', 'SLIDERS'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('Validation errors in /client/submit-score');
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const response = await fetch(`${BASE_URL}${SCORE_SUBMIT_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.API_KEY
      },
      body: JSON.stringify(req.body)
    });
    if (!response.ok) {
      throw new Error(`Submit score failed with status ${response.status}`);
    }
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Error in client/submit-score');
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/client/fetch-scores', async (req, res) => {
  try {
    const response = await fetch(`${BASE_URL}${SCORE_FETCH_ENDPOINT}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.API_KEY
      }
    });
    if (!response.ok) {
      throw new Error(`Fetch scores failed with status ${response.status}`);
    }
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Error in client/fetch-scores');
    res.status(500).json({ error: 'Server error' });
  }
});

app.post(SCORE_SUBMIT_ENDPOINT, authenticate, [
  body('name')
    .isString().withMessage('Name must be a string')
    .trim()
    .isLength({ max: 16 }).withMessage('Name must be at most 16 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Name can only contain alphanumeric characters, hyphens, and underscores')
    .customSanitizer(value => sanitize(value)),
  body('score')
    .isInt({ min: 0, max: 2147483647 }).withMessage('Score must be an integer between 0 and 2,147,483,647'),
  body('multiplier')
    .isInt({ min: 1, max: 9999 }).withMessage('Multiplier must be an integer between 1 and 9999'),
  body('mode')
    .isIn(['SIMPLE', 'TIMED', 'EXPLOSIONS', 'SLIDERS']).withMessage('Mode must be SIMPLE, TIMED, EXPLOSIONS, or SLIDERS'),
], async (req, res) => {
  console.log('POST request received at:', SCORE_SUBMIT_ENDPOINT);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('Validation errors in /submit-score');
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, score, multiplier, mode } = req.body;

  try {
    const newScore = new Score({ name, score, multiplier, mode });
    const savedScore = await newScore.save();
    console.log('Score saved successfully');

    const message = `New leaderboard entry!\n*Name:* ${name}\n*Score:* ${score}\n*Multiplier:* x${multiplier}\n*Mode:* ${mode}`;
    await sendTelegramNotification(message);

    const responseData = savedScore.toObject();
    delete responseData.__v;
    res.status(201).json(responseData);
  } catch (err) {
    console.error('Error saving score');
    res.status(500).json({ error: 'Server error' });
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
    const slidersScores = await Score.find({ mode: 'SLIDERS' })
      .sort({ score: -1 })
      .limit(5)
      .select('-__v');

    console.log('Scores fetched successfully');
    res.json({
      simple: simpleScores,
      timed: timedScores,
      explosions: explosionsScores,
      sliders: slidersScores
    });
  } catch (err) {
    console.error('Error fetching scores');
    res.status(500).json({ error: 'Server error' });
  }
});

app.use((err, req, res, next) => {
  console.error('Unexpected server error');
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));