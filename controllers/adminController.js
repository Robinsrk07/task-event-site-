const { registerAdmin, loginAdmin, formatAdminResponse } = require('../services/adminService');
const { createdResponse, successResponse } = require('../utils/responseHelper');
const { generateToken } = require('../utils/jwtHelper');

const register = async (req, res) => {
  const admin = await registerAdmin(req.body);
  const adminData = formatAdminResponse(admin);

  createdResponse(
    res,
    { admin: adminData },
    'Admin registered successfully!'
  );
};

const login = async (req, res) => {
  const { email, password } = req.body;

  // Verify credentials
  const admin = await loginAdmin(email, password);

  // Format response
  const adminData = formatAdminResponse(admin);

  // Generate JWT token for 30 days
  const token = generateToken(admin._id, '30d');

  // Set httpOnly cookie (secure for web browsers)
  res.cookie('token', token, {
    httpOnly: true, // Prevents JavaScript access (XSS protection)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  // Send response (no token in response body - using cookie only)
  successResponse(
    res,
    { admin: adminData },
    'Login successful!'
  );
};

// Logout - Clear cookie
const logout = async (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0), // Expire immediately
  });

  successResponse(
    res,
    null,
    'Logged out successfully'
  );
};

// Get logged-in admin profile
const getProfile = async (req, res) => {
  // req.admin is attached by authenticateAdmin middleware
  const adminData = formatAdminResponse(req.admin);

  successResponse(
    res,
    { admin: adminData },
    'Profile retrieved successfully'
  );
};

// Get dashboard data
const getDashboard = async (req, res) => {
  const { getDashboardData } = require('../services/dashboardService');

  // Get pagination params from query
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const status = req.query.status || 'submitted';

  // Validate pagination params
  if (page < 1) {
    throw new ApiError(400, 'Page number must be greater than 0');
  }
  if (limit < 1 || limit > 100) {
    throw new ApiError(400, 'Limit must be between 1 and 100');
  }

  // Get dashboard data (req.admin from middleware)
  const dashboardData = await getDashboardData(req.admin, page, limit, status);

  successResponse(
    res,
    dashboardData,
    'Dashboard data retrieved successfully'
  );
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  getDashboard,
};
