const User = require('../models/User');
const { generateOTP, getOTPExpiry, canSendOTP, isBlocked, getBlockDuration } = require('../utils/otpHelper');
const { sendEmail } = require('../utils/emailService');
const { forgotPasswordTemplate, passwordResetSuccessTemplate } = require('../utils/emailTemplates');
const { generateToken, verifyToken } = require('../utils/jwtHelper');
const bcrypt = require('bcryptjs');
const ApiError = require('../utils/ApiError');

// Step 1: Request Password Reset OTP
const requestMemberPasswordResetOTP = async (email) => {
  try {
    // Find member with OTP fields
    const member = await User.findOne({ email })
      .select('+otp +otpExpiry +otpAttempts +otpMaxAttempts +otpBlockedUntil +lastOtpSentAt');
    
    if (!member) {
      throw new ApiError(404, 'No account found with this email address');
    }

    // Check if member is active
    if (!member.isActive) {
      throw new ApiError(403, 'Account is deactivated. Please contact support.');
    }

    // Check if member is blocked
    const blockStatus = isBlocked(member.otpBlockedUntil);
    if (blockStatus.blocked) {
      throw new ApiError(429, `Account is temporarily blocked. Please try again after ${blockStatus.remainingMinutes} minutes`);
    }

    // Check cooldown
    const cooldownStatus = canSendOTP(member.lastOtpSentAt);
    if (!cooldownStatus.allowed) {
      throw new ApiError(429, `Please wait ${cooldownStatus.remainingSeconds} seconds before requesting another OTP`);
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    // Save OTP to database
    member.otp = otp;
    member.otpExpiry = otpExpiry;
    member.otpAttempts = 0;
    member.lastOtpSentAt = new Date();
    await member.save();

    // Send OTP email
    const emailContent = forgotPasswordTemplate(member.member?.fullName || 'Member', otp);

   
    await sendEmail({to: member.email, subject: 'Password Reset OTP - TechFinit', html: emailContent});


    return {
      message: 'OTP sent successfully to your email',
      email: member.email,
      expiresIn: '10 minutes',
    };
  } catch (error) {
    console.error('Error sending password reset OTP:', error);
    throw error;
  }
};

// Step 2: Verify OTP
const verifyMemberPasswordResetOTP = async (email, otp) => {
  try {
    // Find member with OTP fields
    const member = await User.findOne({ email })
      .select('+otp +otpExpiry +otpAttempts +otpMaxAttempts +otpBlockedUntil +lastOtpSentAt');
    
    if (!member) {
      throw new ApiError(404, 'No account found with this email address');
    }

    // Check if OTP exists
    if (!member.otp || !member.otpExpiry) {
      throw new ApiError(400, 'OTP not found. Please request a new OTP');
    }

    // Check if member is blocked
    const blockStatus = isBlocked(member.otpBlockedUntil);
    if (blockStatus.blocked) {
      throw new ApiError(429, `Account is temporarily blocked. Please try again after ${blockStatus.remainingMinutes} minutes`);
    }

    // Check if OTP is expired
    if (new Date() > member.otpExpiry) {
      // Clear expired OTP
      member.otp = undefined;
      member.otpExpiry = undefined;
      member.otpAttempts = 0;
      await member.save();
      throw new ApiError(400, 'OTP has expired. Please request a new OTP');
    }

    // Verify OTP
    if (member.otp !== otp) {
      // Increment attempts
      member.otpAttempts += 1;

      // Check if max attempts reached
      if (member.otpAttempts >= member.otpMaxAttempts) {
        // Block member
        member.otpBlockedUntil = getBlockDuration();
        member.otp = undefined;
        member.otpExpiry = undefined;
        member.otpAttempts = 0;
        await member.save();
        
        const blockMinutes = parseInt(process.env.OTP_BLOCK_MINUTES) || 30;
        throw new ApiError(429, `Too many failed attempts. Account blocked for ${blockMinutes} minutes`);
      }

      await member.save();
      const remainingAttempts = member.otpMaxAttempts - member.otpAttempts;
      throw new ApiError(400, `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining`);
    }

    // OTP is valid - Generate reset token (15 minutes)
    const resetToken = generateToken(member._id, '15m');

    // Clear OTP data
    member.otp = undefined;
    member.otpExpiry = undefined;
    member.otpAttempts = 0;
    member.otpBlockedUntil = undefined;
    await member.save();

    console.log(`✅ OTP verified for member: ${member.email}`);

    return {
      message: 'OTP verified successfully. You can now reset your password',
      resetToken,
      expiresIn: '15 minutes',
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

// Step 3: Reset Password
const resetMemberPassword = async (resetToken, newPassword) => {
  try {
    // Verify reset token
    const decoded = verifyToken(resetToken);
    if (!decoded) {
      throw new ApiError(401, 'Invalid or expired reset token. Please request a new OTP');
    }

    // Find member
    const member = await User.findById(decoded.id);
    if (!member) {
      throw new ApiError(404, 'Member not found');
    }


    // Update password
    member.password = newPassword;
    await member.save();

    // Send success email
    const emailContent = passwordResetSuccessTemplate(member.member?.fullName || 'Member');
    await sendEmail({to: member.email, subject: 'Password Reset Successful - TechFinit', html: emailContent});

    return {
      message: 'Password reset successful. You can now login with your new password',
      email: member.email,
    };
  } catch (error) {
    throw new ApiError(500, 'Failed to reset password. Please try again later.');
  }
};

module.exports = {
  requestMemberPasswordResetOTP,
  verifyMemberPasswordResetOTP,
  resetMemberPassword,
};
