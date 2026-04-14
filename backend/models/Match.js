const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    team1: {
        type: String,
        required: true
    },
    team2: {
        type: String,
        required: true
    },

    marketOdds: {
        back: { type: Number, default: 1.9 },
        lay: { type: Number, default: 1.9 }
    },

    manualOdds: {
        back: { type: Number, default: 0 },
        lay: { type: Number, default: 0 }
    },

    finalOdds: {
        back: { type: Number, default: 1.9 },
        lay: { type: Number, default: 1.9 }
    },

    winner: {
        type: String,
        default: null
    },

    status: {
        type: String,
        enum: ['upcoming', 'live', 'completed'],
        default: 'live'
    }

}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
