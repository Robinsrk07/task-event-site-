const Admin = require('../models/Admin');
const ApiError = require('../utils/ApiError');

const checkEmailExists = async (email) => {
  const admin = await Admin.findOne({ email });
  if (admin) {
    throw new ApiError(400, 'Email already registered');
  }
};

const checkPhoneExists = async (phone) => {
  const admin = await Admin.findOne({ phone });
  if (admin) {
    throw new ApiError(400, 'Phone number already registered');
  }
};

const checkUsernameExists = async (username) => {
  if (username) {
    const admin = await Admin.findOne({ username });
    if (admin) {
      throw new ApiError(400, 'Username already taken');
    }
  }
};

const registerAdmin = async (body) => {
  const { email, password, phone, username, fullName, role, profilePic } = body;

  await checkEmailExists(email);
  await checkPhoneExists(phone);
  await checkUsernameExists(username);

  const adminData = {
    email,
    password,
    phone,
    fullName,
    role: role || 'admin',
    username: username || undefined,
    profilePic: profilePic || undefined,
  };

  const admin = await Admin.create(adminData);
  return admin;
};

const formatAdminResponse = (admin) => {
  return {
    id: admin._id,
    email: admin.email,
    username: admin.username,
    fullName: admin.fullName,
    phone: admin.phone,
    role: admin.role,
    profilePic: admin.profilePic,
    isActive: admin.isActive,
    createdAt: admin.createdAt,
  };
};

const loginAdmin = async (email, password) => {
  // Find admin by email (include password field)
  const admin = await Admin.findOne({ email }).select('+password');

  if (!admin) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Check if admin is active
  if (!admin.isActive) {
    throw new ApiError(401, 'Your account has been deactivated. Please contact administrator.');
  }

  // Compare password
  const isPasswordMatch = await admin.comparePassword(password);

  if (!isPasswordMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  return admin;
};

module.exports = {
  checkEmailExists,
  checkPhoneExists,
  checkUsernameExists,
  registerAdmin,
  loginAdmin,
  formatAdminResponse,
};
