const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    matchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Match',
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    odds: {
        type: Number,
        required: true
    },

    team: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: ['active', 'win', 'loss', 'cancelled'],
        default: 'active'
    },

    payout: {
        type: Number,
        default: 0
    }

}, { timestamps: true });

module.exports = mongoose.model('Bet', betSchema);
