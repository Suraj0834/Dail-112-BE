// =============================================================================
// controllers/auth.controller.js - Authentication Controller
// Handles: register, login, profile, forgot-password, reset-password
// =============================================================================

'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');
const { sendOtpEmail } = require('../utils/mailer');

/**
 * generateToken - Create JWT token with userId and role
 * @param {string} userId - MongoDB ObjectId
 * @param {string} role - 'citizen' or 'police'
 * @returns {string} signed JWT
 */
const generateToken = (userId, role) => {
    return jwt.sign(
        { userId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

/**
 * POST /api/auth/register
 * Register a new Citizen or Police account
 */
const register = async (req, res) => {
    const { name, email, password, phone, role, badgeId, station } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone) {
        throw new AppError('Name, email, password, and phone are required', 400);
    }

    // Police officers must provide a badge ID
    if (role === 'police' && !badgeId) {
        throw new AppError('Badge ID is required for police registration', 400);
    }

    // Check for existing email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        throw new AppError('An account with this email already exists', 409);
    }

    // Check for existing badge ID (police)
    if (badgeId) {
        const existingBadge = await User.findOne({ badgeId });
        if (existingBadge) {
            throw new AppError('This badge ID is already registered', 409);
        }
    }

    // Create user (password will be hashed by pre-save hook)
    const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        phone,
        role: role || 'citizen',
        badgeId: badgeId || null,
        station: station || null
    });

    const token = generateToken(user._id, user.role);

    logger.info(`New ${user.role} registered: ${user.email}`);

    res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user: user.toPublicJSON()
    });
};

/**
 * POST /api/auth/login
 * Authenticate with email + password, return JWT
 */
const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new AppError('Email and password are required', 400);
    }

    // Find user with password (default: select: false)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    // Generic error message (don't reveal whether email exists)
    if (!user || !(await user.comparePassword(password))) {
        throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
        throw new AppError('Account is deactivated. Contact admin.', 403);
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id, user.role);

    logger.info(`User logged in: ${user.email} [${user.role}]`);

    res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: user.toPublicJSON()
    });
};

/**
 * GET /api/auth/profile
 * Get current user's profile (protected)
 */
const getProfile = async (req, res) => {
    // req.user is already loaded by authenticate middleware
    res.status(200).json({
        success: true,
        user: req.user.toPublicJSON()
    });
};

/**
 * PUT /api/auth/profile
 * Update the current user's name and/or phone
 */
const updateProfile = async (req, res) => {
    const allowed = ['name', 'phone'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f].trim(); });

    if (Object.keys(updates).length === 0) {
        throw new AppError('No updatable fields provided', 400);
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, user: user.toPublicJSON() });
};

module.exports = { register, login, getProfile, updateProfile, forgotPassword, resetPassword };

// =============================================================================
// POST /api/auth/forgot-password
// Generate a 6-digit OTP, store a bcrypt hash of it, and email it to the user.
// =============================================================================
async function forgotPassword(req, res) {
    const { email } = req.body;

    if (!email) throw new AppError('Email is required', 400);

    // Look up user — but do NOT reveal whether an account exists
    const user = await User.findOne({ email: email.toLowerCase() })
        .select('+resetOtp +resetOtpExpiry');

    if (user) {
        // Log email config for debugging (sanitize password)
        logger.info(`🔧 Email Config: host=${process.env.MAIL_HOST}, port=${process.env.MAIL_PORT}, user=${process.env.MAIL_USER}, secure=${process.env.MAIL_PORT === '465'}`);

        // Generate cryptographically secure 6-digit OTP
        const otp = String(crypto.randomInt(100000, 999999));
        logger.info(`📧 Attempting to send OTP to ${user.email}`);

        // Hash the OTP before storing (SHA-256 is fine here — short-lived token)
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

        user.resetOtp       = otpHash;
        user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
        await user.save({ validateBeforeSave: false });

        try {
            await sendOtpEmail(user.email, otp, user.name);
            logger.info(`✅ Password reset OTP sent successfully to ${user.email}`);
        } catch (mailErr) {
            // Clear the OTP so the user can retry cleanly
            user.resetOtp       = null;
            user.resetOtpExpiry = null;
            await user.save({ validateBeforeSave: false });

            // Log detailed error information
            logger.error('❌ Mailer error during forgot-password:');
            logger.error(`Error message: ${mailErr.message}`);
            logger.error(`Error code: ${mailErr.code}`);
            logger.error(`Error command: ${mailErr.command}`);
            logger.error(`Full error:`, mailErr);

            throw new AppError('Failed to send OTP email. Please try again later.', 500);
        }
    } else {
        logger.warn(`⚠️ Forgot-password requested for non-existent email: ${email}`);
    }

    // Always return the same response (security: don't reveal account existence)
    res.status(200).json({
        success: true,
        message: 'If an account with that email exists, an OTP has been sent.',
    });
}

// =============================================================================
// POST /api/auth/reset-password
// Verify OTP (plain-text against stored hash) and update the password.
// Body: { email, otp, newPassword }
// =============================================================================
async function resetPassword(req, res) {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        throw new AppError('Email, OTP, and new password are required', 400);
    }
    if (newPassword.length < 6) {
        throw new AppError('Password must be at least 6 characters', 400);
    }

    const otpHash = crypto.createHash('sha256').update(String(otp)).digest('hex');

    const user = await User.findOne({
        email:          email.toLowerCase(),
        resetOtp:       otpHash,
        resetOtpExpiry: { $gt: new Date() }, // Must not be expired
    }).select('+resetOtp +resetOtpExpiry +password');

    if (!user) {
        throw new AppError('Invalid or expired OTP. Please request a new one.', 400);
    }

    // Update password (pre-save hook will hash it) and clear OTP fields
    user.password       = newPassword;
    user.resetOtp       = null;
    user.resetOtpExpiry = null;
    await user.save();

    logger.info(`Password reset successfully for ${user.email}`);

    res.status(200).json({
        success: true,
        message: 'Password reset successfully. You can now sign in.',
    });
}

