// =============================================================================
// utils/logger.js - Winston Logger Configuration
// Provides structured logging for development and production
// =============================================================================

'use strict';

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// ── Custom log format ────────────────────────────────────────────────────────
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// ── Console format (human-readable for development) ────────────────────────
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
        return `${timestamp} [${level}]: ${stack || message}`;
    })
);

// ── Create Logger ────────────────────────────────────────────────────────────
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'dial112-backend' },
    transports: [
        // Error level: separate file for quick debugging
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024,   // 10MB max
            maxFiles: 5,
            tailable: true
        }),

        // Combined log: all levels
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 20 * 1024 * 1024,   // 20MB max
            maxFiles: 10,
            tailable: true
        })
    ]
});

// Add console output in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

module.exports = logger;
