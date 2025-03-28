const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors()); // Allows client on different port (e.g., 8080) to access
app.use(express.json());

// MongoDB Atlas Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Atlas connected'))
  .catch(err => console.error('MongoDB Atlas connection error:', err));

// Score Model
const Score = require('./models/Score');

// API Routes
// Submit a score
app.post('/api/scores', async (req, res) => {
  const { name, score, mode } = req.body;
  try {
    const newScore = new Score({ name, score, mode });
    await newScore.save();
    // Ensure __v is not included in the response
    const responseData = newScore.toObject();
    delete responseData.__v;
    res.status(201).json(responseData);
  } catch (err) {
    console.error('Error saving score:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get top 5 scores for each mode
app.get('/api/scores', async (req, res) => {
  try {
    const simpleScores = await Score.find({ mode: 'SIMPLE' })
      .sort({ score: -1 })
      .limit(5)
      .select('-__v'); // Exclude __v from the results
    const timedScores = await Score.find({ mode: 'TIMED' })
      .sort({ score: -1 })
      .limit(5)
      .select('-__v'); // Exclude __v from the results
    const explosionsScores = await Score.find({ mode: 'EXPLOSIONS' })
      .sort({ score: -1 })
      .limit(5)
      .select('-__v'); // Exclude __v from the results

    res.json({
      simple: simpleScores,
      timed: timedScores,
      explosions: explosionsScores,
    });
  } catch (err) {
    console.error('Error fetching scores:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));