const { requestPasswordResetOTP, verifyPasswordResetOTP, resetPassword } = require('../services/forgotPasswordService');
const { successResponse } = require('../utils/responseHelper');

// Forgot Password - Request OTP
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const result = await requestPasswordResetOTP(email);

  successResponse(
    res,
    { email: result.email },
    'OTP sent to your email. Valid for 10 minutes'
  );
};

// Verify OTP
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  const result = await verifyPasswordResetOTP(email, otp);

  successResponse(
    res,
    { resetToken: result.resetToken },
    'OTP verified successfully. You can now reset your password'
  );
};

// Reset Password
const resetPasswordController = async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  const result = await resetPassword(resetToken, newPassword, confirmPassword);

  successResponse(
    res,
    { email: result.email },
    'Password reset successfully. You can now login with your new password'
  );
};

module.exports = {
  forgotPassword,
  verifyOTP,
  resetPasswordController,
};
