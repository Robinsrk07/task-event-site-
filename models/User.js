const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // AUTHENTICATION & BASIC INFO
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
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    membershipNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    membershipType: {
      type: String,
      enum: ['new', 'renewal'],
      required: true,
      default: 'new',
    },

    // ESTABLISHMENT DETAILS
    establishment: {
      name: {
        type: String,
        required: [true, 'Establishment name is required'],
        trim: true,
      },
      tradeName: {
        type: String,
        required: [true, 'Trade name is required'],
        trim: true,
      },
      yearOfEstablishment: {
        type: Number,
        required: [true, 'Year of establishment is required'],
        min: [1800, 'Year must be between 1800 and current year'],
        max: [new Date().getFullYear(), 'Year cannot be in the future'],
      },
      officialClassification: {
        type: String,
        required: [true, 'Official classification is required'],
        enum: ['Proprietorship', 'Partnership', 'Private Limited', 'Public Limited', 'LLP', 'Other'],
      },
      businessType: {
        type: String,
        required: [true, 'Business type is required'],
        enum: ['Retail', 'Wholesale', 'Service', 'Manufacturing', 'Trading', 'Other'],
      },
      organizationalStatus: {
        type: String,
        required: [true, 'Organizational status is required'],
        enum: ['Active', 'Inactive', 'Under Process', 'Closed'],
        default: 'Active',
      },
      officialEmail: {
        type: String,
        required: [true, 'Official email is required'],
        lowercase: true,
        trim: true,
      },
      website: {
        type: String,
        trim: true,
      },
      gstRegistered: {
        type: Boolean,
        required: true,
        default: false,
      },
      gstNumber: {
        type: String,
        trim: true,
        uppercase: true,
      },
    },

    // LOCATION DETAILS
    location: {
      district: {
        type: String,
        required: [true, 'District is required'],
        trim: true,
      },
      region: {
        type: String,
        required: [true, 'Region is required'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      pinCode: {
        type: String,
        required: [true, 'Pin code is required'],
        match: [/^6\d{5}$/, 'Pin code must be 6 digits starting with 6'],
      },
      registeredAddress: {
        type: String,
        required: [true, 'Registered address is required'],
        trim: true,
      },
      communicationAddress: {
        type: String,
        trim: true,
      },
      isSameAddress: {
        type: Boolean,
        default: true,
      },
    },

    // MEMBER INFORMATION
    member: {
      officeType: {
        type: String,
        required: [true, 'Office type is required'],
        enum: ['Head Office', 'Branch Office', 'Regional Office', 'Other'],
      },
      roleInAgency: {
        type: String,
        required: [true, 'Member role is required'],
        enum: ['Owner', 'Partner', 'Director', 'Manager', 'Authorized Representative', 'Other'],
      },
      fullName: {
        type: String,
        required: [true, 'Member name is required'],
        trim: true,
      },
      dateOfBirth: {
        type: Date,
        required: [true, 'Date of birth is required'],
      },
      mobile: {
        type: String,
        required: [true, 'Mobile number is required'],
        match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit mobile number'],
      },
      landline: {
        type: String,
        trim: true,
      },
    },

    // PARTNER & STAFF DETAILS
    partner: {
      name: {
        type: String,
        trim: true,
      },
      mobile: {
        type: String,
      },
    },
    staff: {
      name: {
        type: String,
        trim: true,
      },
      mobile: {
        type: String,
      },
    },

    // DOCUMENT UPLOADS
    documents: {
      agencyAddressProof: {
        url: String,
        publicId: String,
        uploadedAt: Date,
      },
      shopPhoto: {
        url: String,
        publicId: String,
        uploadedAt: Date,
      },
      businessCard: {
        url: String,
        publicId: String,
        uploadedAt: Date,
      },
    },

    // STATUS & WORKFLOW
    status: {
      type: String,
      enum: ['submitted', 'verified', 'payment_completed','approved','rejected','change_requested'],
      default: 'submitted',
    },
    rejectionReason: {
      type: String,
      trim: true,
    },

    // REFERRAL SYSTEM
    referral: {
      referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      referralCode: {
        type: String,
        unique: true,
        sparse: true,
      },
      referredMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }],
    },

    // APPROVALS SYSTEM
    approvals: {
      president: {
        approved: {
          type: Boolean,
          default: false,
        },
        approvedAt: Date,
        remarks: String,
      },
      secretary: {
        approved: {
          type: Boolean,
          default: false,
        },
        approvedAt: Date,
        remarks: String,
      },
      treasurer: {
        approved: {
          type: Boolean,
          default: false,
        },
        approvedAt: Date,
        remarks: String,
      },
    },

    // PAYMENT INFORMATION
    payment: {
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
      },
      type: {
        type: String,
        enum: ['new', 'renewal'],
        default: 'new',
      },
      amount: Number,
      baseAmount: Number,
      gstAmount: Number,
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
      transactionId: String,
      paymentDate: Date,
      paymentMethod: String,
    },

    // CERTIFICATE
    certificate: {
      generated: {
        type: Boolean,
        default: false,
      },
      certificateNumber: String,
      issueDate: Date,
      expiryDate: Date,
      status: {
        type: String,
        enum: ['active', 'expiring_soon', 'expired'],
        default: 'active',
      },
      url: String,
      publicId: String,
    },

    // RENEWAL HISTORY
    renewalHistory: [
      {
        renewalDate: Date,
        previousExpiryDate: Date,
        newExpiryDate: Date,
        amount: Number,
        razorpayPaymentId: String,
        status: {
          type: String,
          enum: ['completed', 'failed'],
          default: 'completed',
        },
      },
    ],

    // VERIFICATION FLAGS
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isMobileVerified: {
      type: Boolean,
      default: false,
    },

    // PROFILE CHANGE REQUESTS
    profileChangeRequest: {
      pending: {
        type: Boolean,
        default: false,
      },
      requestedChanges: mongoose.Schema.Types.Mixed,
      requestedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      reviewedBy: {
        adminId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Admin',
        },
        adminRole: String,
        adminName: String,
      },
      reviewedAt: Date,
      rejectionReason: String,
      remarks: String,
    },

    // OTP for Password Reset
    otp: {
      type: String,
      select: false,
    },
    otpExpiry: {
      type: Date,
      select: false,
    },
    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    otpMaxAttempts: {
      type: Number,
      default: 5,
      select: false,
    },
    otpBlockedUntil: {
      type: Date,
      select: false,
    },
    lastOtpSentAt: {
      type: Date,
      select: false,
    },

    lastLogin: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// INDEXES
userSchema.index({ 'member.mobile': 1 });
userSchema.index({ status: 1 });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate membership number
userSchema.methods.generateMembershipNumber = function () {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  this.membershipNumber = `MEM${year}${random}`;
};

// Generate referral code
userSchema.methods.generateReferralCode = function () {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  this.referral.referralCode = `REF${code}`;
};

module.exports = mongoose.model('User', userSchema);
