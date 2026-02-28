const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { register, login, logout, getProfile, getDashboard } = require('../controllers/adminController');
const { forgotPassword, verifyOTP, resetPasswordController } = require('../controllers/forgotPasswordController');
const { getPendingApprovalsController, getPendingApprovalsByRoleController, updateMemberApprovalController, deleteUserController, getApprovedOrRejectedMembersController, toggleMemberBlockStatusController } = require('../controllers/memberController');
const { adminRegisterValidationRules, adminLoginValidationRules, validate } = require('../validators/adminValidator');
const { forgotPasswordValidationRules, verifyOTPValidationRules, resetPasswordValidationRules, validate: validateForgotPassword } = require('../validators/forgotPasswordValidator');
const { approvalValidationRules, validate: validateApproval } = require('../validators/memberValidator');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticateAdmin } = require('../middlewares/authMiddleware');

// Rate limiter for registration
const adminRegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many admin registration attempts. Please try again later.',
});

// Rate limiter for login
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again later.',
});

// Rate limiter for forgot password
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 requests per hour
  message: 'Too many password reset requests. Please try again later.',
});

// Rate limiter for verify OTP
const verifyOTPLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 verification attempts per 15 minutes
  message: 'Too many OTP verification attempts. Please try again later.',
});

// Rate limiter for reset password
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 password reset attempts per 15 minutes
  message: 'Too many password reset attempts. Please try again later.',
});

// Register Admin
router.post(
  '/register',
  adminRegisterLimiter,
  adminRegisterValidationRules,
  validate,
  asyncHandler(register)
);

// Login Admin
router.post(
  '/login',
  adminLoginLimiter,
  adminLoginValidationRules,
  validate,
  asyncHandler(login)
);

// Forgot Password - Request OTP
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  forgotPasswordValidationRules,
  validateForgotPassword,
  asyncHandler(forgotPassword)
);

// Verify OTP
router.post(
  '/verify-otp',
  verifyOTPLimiter,
  verifyOTPValidationRules,
  validateForgotPassword,
  asyncHandler(verifyOTP)
);

// Reset Password
router.post(
  '/reset-password',
  resetPasswordLimiter,
  resetPasswordValidationRules,
  validateForgotPassword,
  asyncHandler(resetPasswordController)
);

// ==================== Protected Routes (Require Authentication) ====================

// Logout - Clear cookie
router.post('/logout', authenticateAdmin, asyncHandler(logout));

// Get Profile - Get logged-in admin details
router.get('/profile', authenticateAdmin, asyncHandler(getProfile));

// Get Dashboard - Get dashboard stats and members list
router.get('/dashboard', authenticateAdmin, asyncHandler(getDashboard));

// Get Pending Approvals - Get all members needing approval (any role)
router.get('/pending-approvals', authenticateAdmin, asyncHandler(getPendingApprovalsController));

// Get Pending Approvals by Role - Get members needing approval for specific role
router.get('/pending-approvals/:role', authenticateAdmin, asyncHandler(getPendingApprovalsByRoleController));

// Update Member Approval - Approve or Reject member
router.put('/members/:id/approval', authenticateAdmin, approvalValidationRules, validateApproval, asyncHandler(updateMemberApprovalController));

// Get Processed Members (Approved or Rejected)
router.get('/members/processed', authenticateAdmin, asyncHandler(getApprovedOrRejectedMembersController));

// Block/Unblock a user (Change status)
router.put('/members/:id/block', authenticateAdmin, asyncHandler(toggleMemberBlockStatusController));

// Delete User Profile - Remove member entirely
router.delete('/members/:id', authenticateAdmin, asyncHandler(deleteUserController));

module.exports = router;
