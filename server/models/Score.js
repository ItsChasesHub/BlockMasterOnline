const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Store the player's name directly
    score: { type: Number, required: true },
    mode: { type: String, required: true, enum: ['SIMPLE', 'TIMED', 'EXPLOSIONS'] }, // Game mode
    createdAt: { type: Date, default: Date.now }
}, {
    versionKey: false // Disable the __v field
});

// Explicitly set the collection name to 'LeaderboardScores'
module.exports = mongoose.model('LeaderboardsScores', ScoreSchema, 'LeaderboardScores');