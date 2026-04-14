const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    team1: String,
    team2: String,

    marketOdds: {
        back: Number,
        lay: Number
    },

    manualOdds: {
        back: Number,
        lay: Number
    },

    finalOdds: {
        back: Number,
        lay: Number
    },

    winner: String,
    status: String
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
