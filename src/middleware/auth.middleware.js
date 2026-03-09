// =============================================================================
// middleware/auth.middleware.js - JWT Authentication & RBAC Middleware
// =============================================================================

'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const logger = require('../utils/logger');

/**
 * authenticate - Middleware to verify JWT token on protected routes
 *
 * Flow:
 * 1. Extract Bearer token from Authorization header
 * 2. Verify JWT signature and expiry
 * 3. Load user from DB to ensure they still exist and are active
 * 4. Attach user to req.user for downstream handlers
 */
const authenticate = async (req, res, next) => {
    try {
        // Extract token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please login.'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Session expired. Please login again.'
                });
            }
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Please login again.'
            });
        }

        // Load user from DB (ensures user still exists and is active)
        const user = await User.findById(decoded.userId).select('-password');
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account not found or deactivated.'
            });
        }

        // Attach to request
        req.user = user;
        next();

    } catch (error) {
        logger.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

/**
 * authorize - Role-Based Access Control (RBAC) middleware factory
 *
 * Usage: router.delete('/case', authenticate, authorize('police', 'admin'), handler)
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${roles.join(' or ')}`
            });
        }

        next();
    };
};

module.exports = { authenticate, authorize };
