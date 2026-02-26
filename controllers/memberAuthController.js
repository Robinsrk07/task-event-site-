const { loginMember, getMemberProfile } = require('../services/memberAuthService');
const { requestMemberPasswordResetOTP, verifyMemberPasswordResetOTP, resetMemberPassword } = require('../services/memberForgotPasswordService');
const { successResponse } = require('../utils/responseHelper');

// Member Login
const login = async (req, res) => {
  const { email, password } = req.body;

  const result = await loginMember(email, password);

  // Set httpOnly cookie
  res.cookie('memberToken', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  successResponse(
    res,
    { member: result.member },
    'Login successful!'
  );
};

// Member Logout
const logout = async (req, res) => {
  res.clearCookie('memberToken');
  successResponse(res, null, 'Logout successful');
};

// Get Member Profile
const getProfile = async (req, res) => {
  const memberId = req.member.id;
  const profile = await getMemberProfile(memberId);
  successResponse(res, { member: profile }, 'Profile retrieved successfully');
};

// Forgot Password - Step 1: Request OTP
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const result = await requestMemberPasswordResetOTP(email);
  successResponse(res, result, result.message);
};

// Forgot Password - Step 2: Verify OTP
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  const result = await verifyMemberPasswordResetOTP(email, otp);
  successResponse(res, result, result.message);
};

// Forgot Password - Step 3: Reset Password
const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;
  const result = await resetMemberPassword(resetToken, newPassword);
  successResponse(res, null, result.message);
};

module.exports = {
  login,
  logout,
  getProfile,
  forgotPassword,
  verifyOTP,
  resetPassword,
};
