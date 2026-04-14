require('dotenv').config(); // ✅ STEP 2 FIX (env load)

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');          // ✅ logging
const compression = require('compression'); // ✅ speed
const routes = require('./routes');
const connectDB = require('./db'); // ✅ FIXED (MongoDB connect)

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet());
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// Logging
app.use(morgan('dev'));

// Compression
app.use(compression());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ❌ REMOVED initializeDatabase()
// ✔ MongoDB connect added properly

// Routes
app.use('/api', routes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 Handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 🚀 START SERVER + DB CONNECT
app.listen(PORT, async () => {
    await connectDB(); // ✅ MongoDB connect here
    console.log(`🚀 BetPro Backend running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
