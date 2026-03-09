// =============================================================================
// server.js - HTTP Server + Socket.IO setup
// This is the entry point. Connects to MongoDB and starts listening.
// =============================================================================

'use strict';

require('dotenv').config();

const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/database');
const { initSockets } = require('./sockets/socketHandler');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5001;

// ── Async boot function ──────────────────────────────────────────────────────
async function startServer() {
    try {
        // 1. Connect to MongoDB
        await connectDB();
        logger.info('✅ MongoDB connected successfully');

        // 2. Create HTTP server wrapping Express app
        const httpServer = http.createServer(app);

        // 3. Initialize Socket.IO for real-time features
        const io = initSockets(httpServer);
        app.set('io', io);  // Store io on the Express app for use in controllers
        logger.info('✅ Socket.IO initialized');

        // 4. Start listening
        httpServer.listen(PORT, '0.0.0.0', () => {
            logger.info(`🚀 Dial-112 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
        });

        // 5. Graceful shutdown handlers
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received. Shutting down gracefully...');
            httpServer.close(() => {
                logger.info('HTTP server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', async () => {
            logger.info('SIGINT received. Shutting down gracefully...');
            httpServer.close(() => process.exit(0));
        });

    } catch (error) {
        logger.error('❌ Fatal startup error:', error);
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

startServer();
