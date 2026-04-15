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

// 🔥 CORS FIX (IMPORTANT)
app.use(cors({
    origin: "*",   // 🔥 CHANGE: sab allow (abhi testing ke liye best)
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
app.use(limiter);

// 🔥 BODY PARSER
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 🔥 ROOT FIX (NEW ADD)
app.get('/', (req, res) => {
    res.json({ message: "BetPro API Running 🚀" });
});

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

// 🚀 START SERVER
const startServer = async () => {
    try {
        await connectDB();
        console.log("✅ Database Connected Successfully");

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });

    } catch (err) {
        console.error("❌ Server startup failed:", err.message);
        process.exit(1);
    }
};

startServer();
