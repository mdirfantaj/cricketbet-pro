const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET;

// =========================
// 🔐 AUTH MIDDLEWARE
// =========================
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = {
            userId: user._id,
            role: user.role,
            balance: user.balance
        };

        req.token = token;

        next();

    } catch (error) {
        return res.status(401).json({
            error: 'Invalid or expired token'
        });
    }
};

// =========================
// 🛡 ROLE MIDDLEWARE
// =========================
const roleMiddleware = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};

// =========================
// ✅ VALIDATION MIDDLEWARE
// =========================
const validateRequest = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(v => v.run(req)));

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        next();
    };
};

module.exports = {
    authMiddleware,
    roleMiddleware,
    validateRequest
};
