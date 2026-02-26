const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwtHelper');
const ApiError = require('../utils/ApiError');

// Member Login
const loginMember = async (email, password) => {
  try {
    // Find member by email (include password field)
    const member = await User.findOne({ email }).select('+password');

    if (!member) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Check if member is active
    if (!member.isActive) {
      throw new ApiError(403, 'Your account has been deactivated. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, member.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Check member status
    if (member.status === 'rejected') {
      throw new ApiError(403, 'Your application has been rejected. Please contact support for more information.');
    }

    // Generate JWT token (30 days expiry)
    const token = generateToken(member._id, '30d');

    // Return member data (without password)
    const memberData = {
      id: member._id,
      email: member.email,
      fullName: member.member?.fullName,
      mobile: member.member?.mobile,
      establishmentName: member.establishment?.name,
      membershipNumber: member.membershipNumber,
      membershipType: member.membershipType,
      status: member.status,
      isEmailVerified: member.isEmailVerified,
      isMobileVerified: member.isMobileVerified,
      createdAt: member.createdAt,
    };

    console.log(`✅ Member logged in: ${member.email}`);

    return {
      member: memberData,
      token,
    };
  } catch (error) {
    console.error('Error during member login:', error);
    throw error;
  }
};

// Get Member Profile
const getMemberProfile = async (memberId) => {
  try {
    const member = await User.findById(memberId).select('-password').lean();

    if (!member) {
      throw new ApiError(404, 'Member not found');
    }

    return member;
  } catch (error) {
    console.error('Error fetching member profile:', error);
    throw error;
  }
};

module.exports = {
  loginMember,
  getMemberProfile,
};
