// =============================================================================
// app.js - Express Application Setup (No HTTP server binding)
// Separation: app.js = middleware + routes, server.js = HTTP/Socket binding
// =============================================================================

'use strict';

require('express-async-errors');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// ── Load all Mongoose models (so mongoose.model() lookups work) ────────────
require('./models/User.model');
require('./models/Case.model');
require('./models/SosLog.model');
require('./models/Vehicle.model');
require('./models/Criminal.model');
require('./models/Hotspot.model');
require('./models/Role.model');
require('./models/PcrVan.model');

// ── Route imports ──────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const sosRoutes = require('./routes/sos.routes');
const casesRoutes = require('./routes/cases.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const aiRoutes = require('./routes/ai.routes');
const portalRoutes = require('./routes/portal.routes');
const pcrRoutes = require('./routes/pcr.routes');
const criminalsRoutes = require('./routes/criminals.routes');

const app = express();

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Set secure HTTP headers (XSS, clickjacking, MIME-sniff protection)
app.use(helmet({
    crossOriginEmbedderPolicy: false,           // Required for Socket.IO
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
    crossOriginResourcePolicy: { policy: 'cross-origin' },  // Allow images/files from this server to be loaded by other origins (dev frontend on different port)
}));

// CORS - Allow only known origins in production
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? [process.env.ALLOWED_ORIGIN || 'https://dial112.gov.in']
        : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));

// Prevent MongoDB query injection attacks
app.use(mongoSanitize());

// =============================================================================
// RATE LIMITING - Prevent brute-force & DDoS
// =============================================================================

// Global rate limiter: 100 requests per 15 minutes per IP (2000 in dev for bulk ops)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,      // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Try again later.' }
});

// Auth rate limiter: tighter limits for login/register
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many auth attempts. Try again in 15 minutes.' }
});

// SOS rate limiter: allow frequent SOS from same IP in emergencies
const sosLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,       // 1 minute
    max: 20,
    message: { success: false, message: 'SOS rate limit reached.' }
});

app.use(globalLimiter);

// =============================================================================
// REQUEST PARSING MIDDLEWARE
// =============================================================================

app.use(express.json({ limit: '10mb' }));           // JSON body parser
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());                             // Gzip compression

// Static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// =============================================================================
// LOGGING
// =============================================================================

// HTTP request logging (Morgan → Winston)
app.use(morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) }
}));

// =============================================================================
// HEALTH CHECK ENDPOINT
// =============================================================================

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// =============================================================================
// API ROUTES
// =============================================================================

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/sos', sosLimiter, sosRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/pcr-vans', pcrRoutes);
app.use('/api/criminals', criminalsRoutes);

// =============================================================================
// ERROR HANDLING (must be last)
// =============================================================================

app.use(notFoundHandler);    // 404 handler
app.use(errorHandler);       // Centralized error handler

module.exports = app;
