const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: true,
        minlength: 6
    },

    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },

    balance: {
        type: Number,
        default: 0,
        min: 0   // ❗ negative balance prevent
    }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
