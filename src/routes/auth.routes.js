// =============================================================================
// routes/auth.routes.js - Authentication Routes
// =============================================================================

'use strict';

const express = require('express');
const {
    register,
    login,
    getProfile,
    forgotPassword,
    resetPassword,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// POST /api/auth/register - Register new user
router.post('/register', register);

// POST /api/auth/login - Login
router.post('/login', login);

// GET /api/auth/profile - Get current user (protected)
router.get('/profile', authenticate, getProfile);

// POST /api/auth/forgot-password - Send OTP to email
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password - Verify OTP and set new password
router.post('/reset-password', resetPassword);

// PUT /api/auth/profile - Update profile (name, phone)
const { updateProfile } = require('../controllers/auth.controller');
router.put('/profile', authenticate, updateProfile);

module.exports = router;

