const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
    userId: String,
    matchId: String,
    amount: Number,
    odds: Number,
    team: String,
    status: { type: String, default: 'active' },
    payout: Number
}, { timestamps: true });

module.exports = mongoose.model('Bet', betSchema);
