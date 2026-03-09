// =============================================================================
// config/database.js - MongoDB Connection Configuration
// =============================================================================

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * connectDB - Establishes connection to MongoDB with retry logic
 * Uses Mongoose connection pooling with optimized settings for production
 */
async function connectDB() {
    const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dial112';

    const options = {
        // Connection Pool Settings
        maxPoolSize: 10,            // Max 10 concurrent connections
        minPoolSize: 2,             // Keep minimum 2 connections alive
        socketTimeoutMS: 45000,     // Close sockets after 45s of inactivity
        serverSelectionTimeoutMS: 5000,  // Time to find a valid MongoDB server

        // Monitoring
        heartbeatFrequencyMS: 10000,    // Health check every 10 seconds

        // Auto-index in development only (disable in production for performance)
        autoIndex: process.env.NODE_ENV !== 'production'
    };

    // Mongoose query buffer (disable to get immediate errors if not connected)
    mongoose.set('bufferCommands', false);

    try {
        await mongoose.connect(MONGO_URI, options);

        // Log connection events
        mongoose.connection.on('disconnected', () => {
            logger.warn('⚠️  MongoDB disconnected. Attempting reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('✅ MongoDB reconnected');
        });

        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
        });

    } catch (error) {
        logger.error('Failed to connect to MongoDB:', error.message);
        throw error;
    }
}

module.exports = { connectDB };
