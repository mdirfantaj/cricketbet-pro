require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');

const routes = require('./routes');
const connectDB = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// 🔥 SECURITY
app.use(helmet());

app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// 🔥 LOGGING
app.use(morgan('dev'));

// 🔥 SPEED
app.use(compression());

// 🔥 RATE LIMIT
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// 🔥 BODY PARSER
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 🔥 ROUTES
app.use('/api', routes);

// 🔥 HEALTH CHECK
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// 🔥 404
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// 🔥 ERROR HANDLER
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development'
            ? err.message
            : 'Something went wrong'
    });
});

// 🚀 START SERVER (PRODUCTION SAFE)
const startServer = async () => {
    try {
        await connectDB(); // 🔥 FIRST DB CONNECT

        app.listen(PORT, () => {
            console.log(`🚀 BetPro Backend running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
        });

    } catch (err) {
        console.error("❌ Server startup failed:", err.message);
        process.exit(1);
    }
};

startServer();
