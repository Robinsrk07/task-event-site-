const otpGenerator = require('otp-generator');

// Generate OTP with configurable length
const generateOTP = () => {
  const length = parseInt(process.env.OTP_LENGTH) || 6;
  
  return otpGenerator.generate(length, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
};

// Calculate OTP expiry time
const getOTPExpiry = () => {
  const minutes = parseInt(process.env.OTP_EXPIRE_MINUTES) || 10;
  return new Date(Date.now() + minutes * 60 * 1000);
};

// Check if cooldown period has passed
const canSendOTP = (lastOtpSentAt) => {
  if (!lastOtpSentAt) return { allowed: true };

  const cooldownSeconds = parseInt(process.env.OTP_COOLDOWN_SECONDS) || 60;
  const timeSinceLastOTP = Date.now() - lastOtpSentAt.getTime();
  const cooldownTime = cooldownSeconds * 1000;

  if (timeSinceLastOTP < cooldownTime) {
    const remainingSeconds = Math.ceil((cooldownTime - timeSinceLastOTP) / 1000);
    return {
      allowed: false,
      remainingSeconds,
    };
  }

  return { allowed: true };
};

// Check if user is blocked
const isBlocked = (otpBlockedUntil) => {
  if (!otpBlockedUntil) return { blocked: false };

  if (otpBlockedUntil > new Date()) {
    const remainingMinutes = Math.ceil((otpBlockedUntil - new Date()) / 60000);
    return {
      blocked: true,
      remainingMinutes,
    };
  }

  return { blocked: false };
};

// Get block duration
const getBlockDuration = () => {
  const minutes = parseInt(process.env.OTP_BLOCK_MINUTES) || 30;
  return new Date(Date.now() + minutes * 60 * 1000);
};

module.exports = {
  generateOTP,
  getOTPExpiry,
  canSendOTP,
  isBlocked,
  getBlockDuration,
};
