const Admin = require('../models/Admin');
const ApiError = require('../utils/ApiError');
const { generateOTP, getOTPExpiry, canSendOTP, isBlocked, getBlockDuration } = require('../utils/otpHelper');
const { sendEmail } = require('../utils/emailService');
const { forgotPasswordTemplate } = require('../utils/emailTemplates');
const { generateToken } = require('../utils/jwtHelper');

// Request OTP for forgot password
const requestPasswordResetOTP = async (email) => {
  // 1. Find admin by email
  const admin = await Admin.findOne({ email }).select('+otp +otpExpiry');

  if (!admin) {
    throw new ApiError(404, 'No account found with this email address');
  }

  // 2. Check if account is active
  if (!admin.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Please contact support.');
  }

  // 3. Check if user is blocked
  const blockStatus = isBlocked(admin.otpBlockedUntil);
  if (blockStatus.blocked) {
    throw new ApiError(
      429,
      `Too many failed attempts. Account blocked for ${blockStatus.remainingMinutes} more minutes`
    );
  }

  // 4. Check cooldown period
  const cooldownStatus = canSendOTP(admin.lastOtpSentAt);
  if (!cooldownStatus.allowed) {
    throw new ApiError(
      429,
      `Please wait ${cooldownStatus.remainingSeconds} seconds before requesting a new OTP`
    );
  }

  // 5. Generate OTP
  const otp = generateOTP();
  const otpExpiry = getOTPExpiry();

  // 6. Save OTP in database with TTL
  admin.otp = otp;
  admin.otpExpiry = otpExpiry;
  admin.otpAttempts = 0; // Reset attempts on new OTP
  admin.lastOtpSentAt = new Date();
  admin.otpBlockedUntil = undefined; // Unblock if was blocked
  await admin.save();

  // 7. Send OTP via email
  const emailHtml = forgotPasswordTemplate(admin.fullName || 'User', otp);
  await sendEmail({
    to: admin.email,
    subject: '🔐 Password Reset OTP - TechFinit',
    html: emailHtml,
  });

  return {
    message: 'OTP sent successfully to your email',
    email: admin.email,
  };
};

// Verify OTP with attempts tracking
const verifyPasswordResetOTP = async (email, enteredOTP) => {
  // 1. Find admin by email with OTP fields
  const admin = await Admin.findOne({ email }).select('+otp +otpExpiry');

  if (!admin) {
    throw new ApiError(404, 'No account found with this email address');
  }

  // 2. Check if OTP exists
  if (!admin.otp) {
    throw new ApiError(400, 'OTP not found. Please request a new OTP');
  }

  // 3. Check if OTP expired
  if (admin.otpExpiry < new Date()) {
    // Clear expired OTP
    admin.otp = undefined;
    admin.otpExpiry = undefined;
    await admin.save();
    throw new ApiError(400, 'OTP has expired. Please request a new OTP');
  }

  // 4. Check if user is blocked
  const blockStatus = isBlocked(admin.otpBlockedUntil);
  if (blockStatus.blocked) {
    throw new ApiError(
      429,
      `Account temporarily blocked due to too many failed attempts. Try again after ${blockStatus.remainingMinutes} minutes`
    );
  }

  // 5. Verify OTP
  if (admin.otp !== enteredOTP) {
    // Increment failed attempts
    admin.otpAttempts += 1;

    // Block if max attempts reached
    if (admin.otpAttempts >= admin.otpMaxAttempts) {
      admin.otpBlockedUntil = getBlockDuration(); // Block for 30 minutes
      await admin.save();
      throw new ApiError(
        429,
        `Too many failed attempts. Account blocked for ${process.env.OTP_BLOCK_MINUTES || 30} minutes`
      );
    }

    await admin.save();

    const remainingAttempts = admin.otpMaxAttempts - admin.otpAttempts;
    throw new ApiError(
      400,
      `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining`
    );
  }

  // 6. OTP is correct - Generate reset token (valid for 15 minutes)
  const resetToken = generateToken(admin._id, '15m');

  // 7. Clear OTP data after successful verification
  admin.otp = undefined;
  admin.otpExpiry = undefined;
  admin.otpAttempts = 0;
  admin.otpBlockedUntil = undefined;
  await admin.save();

  return {
    message: 'OTP verified successfully',
    resetToken,
    adminId: admin._id,
  };
};

// Reset password with token
const resetPassword = async (resetToken, newPassword, confirmPassword) => {
  // 1. Verify passwords match
  if (newPassword !== confirmPassword) {
    throw new ApiError(400, 'Passwords do not match');
  }

  // 2. Verify reset token
  let decoded;
  try {
    const { verifyToken } = require('../utils/jwtHelper');
    decoded = verifyToken(resetToken);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Reset token has expired. Please request a new OTP');
    }
    throw new ApiError(401, 'Invalid reset token');
  }

  // 3. Find admin by ID from token
  const admin = await Admin.findById(decoded.id).select('+password');

  if (!admin) {
    throw new ApiError(404, 'Admin not found');
  }

  // 4. Check if account is active
  if (!admin.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Please contact support.');
  }

  // 5. Update password (will be hashed by pre-save hook)
  admin.password = newPassword;
  await admin.save();

  // 6. Send success email notification
  const { passwordResetSuccessTemplate } = require('../utils/emailTemplates');
  const { sendEmail } = require('../utils/emailService');
  
  try {
    const emailHtml = passwordResetSuccessTemplate(admin.fullName || 'Admin');
    await sendEmail({
      to: admin.email,
      subject: '✅ Password Reset Successful - TechFinit',
      html: emailHtml,
    });
  } catch (emailError) {
    console.error('Failed to send success email:', emailError.message);
    // Don't throw error - password was reset successfully
  }

  return {
    message: 'Password reset successfully',
    email: admin.email,
  };
};

module.exports = {
  requestPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword,
};
