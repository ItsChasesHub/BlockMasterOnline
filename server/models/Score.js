const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 16,
        validate: {
            validator: function(value) {
                /* Ensures that a name is a string and contains only allowed characters (alphanumeric, hyphens, underscores) for SQL Injection Preventions */
                return typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value);
            },
            message: 'Name must be a string containing only alphanumeric characters, hyphens, and underscores'
        }
    },
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 2147483647
    },
    multiplier: {
        type: Number,
        required: true,
        min: 1,
        max: 9999
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