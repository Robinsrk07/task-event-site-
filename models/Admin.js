const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit phone number'],
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: ['super_admin', 'president', 'secretary', 'treasurer', 'admin'],
      default: 'admin',
    },
    profilePic: {
      url: String,
      publicId: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // ==================== OTP System ====================
    otp: {
      type: String,
      select: false, // Don't return in queries for security
    },
    otpExpiry: {
      type: Date,
      select: false,
      // Note: No TTL index here - it would delete entire document
      // We manually clear expired OTPs in service layer
    },
    otpAttempts: {
      type: Number,
      default: 0, // Track failed verification attempts
    },
    otpMaxAttempts: {
      type: Number,
      default: 5, // Maximum allowed attempts before blocking
    },
    otpBlockedUntil: {
      type: Date,
      default: null, // Block user until this time after max attempts
    },
    lastOtpSentAt: {
      type: Date,
      default: null, // Track last OTP send time (for cooldown)
    },
    // ====================================================
  },
  {
    timestamps: true,
  }
);

// Indexes (email and phone already have unique: true, so no need to create again)
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });

// Hash password before saving
adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
adminSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
