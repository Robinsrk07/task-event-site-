const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/jwtHelper');

// Protect routes - verify JWT from cookie
const authenticateAdmin = async (req, res, next) => {
  try {
    // Get token from cookie
    const token = req.cookies.token;

    if (!token) {
      throw new ApiError(401, 'Not authorized. Please login to access this resource');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get admin from token
    const admin = await Admin.findById(decoded.id).select('-password');

    if (!admin) {
      throw new ApiError(401, 'Admin not found. Please login again');
    }

    // Check if admin is active
    if (!admin.isActive) {
      throw new ApiError(403, 'Your account has been deactivated. Please contact support');
    }

    // Attach admin to request object
    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid token. Please login again');
    }
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired. Please login again');
    }
    throw error;
  }
};

// Check specific roles
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      throw new ApiError(
        403,
        `Role '${req.admin.role}' is not authorized to access this resource`
      );
    }
    next();
  };
};

// Authenticate Member Middleware
const authenticateMember = async (req, res, next) => {
  try {
    const token = req.cookies.memberToken;

    if (!token) {
      throw new ApiError(401, 'Not authorized. Please login to access this resource');
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      throw new ApiError(401, 'Invalid or expired token. Please login again');
    }

    const member = await User.findById(decoded.id).select('-password');
    if (!member) {
      throw new ApiError(401, 'Member not found. Please login again');
    }

    if (!member.isActive) {
      throw new ApiError(403, 'Your account has been deactivated. Please contact support.');
    }

    req.member = member;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticateAdmin,
  authorizeRoles,
  authenticateMember,
};
