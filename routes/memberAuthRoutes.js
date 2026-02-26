const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { login, logout, getProfile, forgotPassword, verifyOTP, resetPassword } = require('../controllers/memberAuthController');
const { memberLoginValidationRules, forgotPasswordValidationRules, verifyOTPValidationRules, resetPasswordValidationRules, validate } = require('../validators/memberAuthValidator');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticateMember } = require('../middlewares/authMiddleware');

// // Rate Limiters
// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 10,
//   message: 'Too many login attempts. Please try again after 15 minutes.',
// });

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests. Please try again after 15 minutes.',
});

const verifyOTPLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many OTP verification attempts. Please try again after 15 minutes.',
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset attempts. Please try again after 15 minutes.',
});

// Public Routes

// Member Login
router.post('/login', memberLoginValidationRules, validate, asyncHandler(login));

// Forgot Password - Step 1: Request OTP
router.post('/forgot-password', forgotPasswordValidationRules, validate, asyncHandler(forgotPassword));

// Forgot Password - Step 2: Verify OTP
router.post('/verify-otp', verifyOTPLimiter, verifyOTPValidationRules, validate, asyncHandler(verifyOTP));

// Forgot Password - Step 3: Reset Password
router.post('/reset-password', resetPasswordLimiter, resetPasswordValidationRules, validate, asyncHandler(resetPassword));

// Protected Routes (Require Authentication)

// Member Logout
router.post('/logout', authenticateMember, asyncHandler(logout));

// Get Member Profile
router.get('/profile', authenticateMember, asyncHandler(getProfile));

module.exports = router;
