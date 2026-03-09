// =============================================================================
// middleware/errorHandler.js - Centralized Error Handling
// =============================================================================

'use strict';

const logger = require('../utils/logger');

/**
 * errorHandler - Express error handling middleware
 * Must have 4 parameters for Express to recognize it as error handler
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Mongoose Validation Error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        const errors = Object.values(err.errors).map(e => e.message);
        message = errors.join(', ');
    }

    // Mongoose Duplicate Key (e.g., unique email)
    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue)[0];
        message = `${field} already exists`;
    }

    // Mongoose CastError (invalid ObjectId format)
    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    // JWT Errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid authentication token';
    }

    // Log the error (except 4xx which are client errors)
    if (statusCode >= 500) {
        logger.error(`[${statusCode}] ${req.method} ${req.path} - ${message}`, {
            stack: err.stack,
            body: req.body
        });
    } else {
        logger.warn(`[${statusCode}] ${req.method} ${req.path} - ${message}`);
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

/**
 * notFoundHandler - 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`
    });
};

/**
 * AppError - Custom error class for throwing structured errors
 */
class AppError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = { errorHandler, notFoundHandler, AppError };
