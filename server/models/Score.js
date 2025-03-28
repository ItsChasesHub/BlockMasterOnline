const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
    name: { type: String, required: true },
    score: { type: Number, required: true },
    mode: { type: String, required: true, enum: ['SIMPLE', 'TIMED', 'EXPLOSIONS'] },
    createdAt: { type: Date, default: Date.now }
}, {
    versionKey: false
});

module.exports = mongoose.model('LeaderboardsScores', ScoreSchema, process.env.MONGO_COLLECTION_NAME || 'LeaderboardScores');