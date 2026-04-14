const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { validationResult } = require('express-validator');

// ✅ STEP 3 FIX (NO default fallback)
const JWT_SECRET = process.env.JWT_SECRET;

// JWT Verification Middleware
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Fetch user from DB (NEVER trust frontend data)
        const user = db.data.users.find(u => u.id === decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Role-based Access Control
const roleMiddleware = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};

// Input Validation Helper
const validateRequest = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        
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
