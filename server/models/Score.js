const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 32,
        validate: {
            validator: function(value) {
                // Ensuring that a name is a string and contains only allowed characters (alphanumeric, hyphens, underscores)
                return typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value);
            },
            message: 'Name must be a string containing only alphanumeric characters, hyphens, and underscores'
        }
    },
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 2000000000
    },
    mode: {
        type: String,
        required: true,
        enum: ['SIMPLE', 'TIMED', 'EXPLOSIONS', 'SLIDERS']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    versionKey: false,
    strict: true
});

module.exports = mongoose.model('LeaderboardsScores', ScoreSchema, process.env.MONGO_COLLECTION_NAME || 'LeaderboardScores');