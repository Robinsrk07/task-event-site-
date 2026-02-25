const { body, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

exports.registerValidationRules = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 8 }).withMessage('Password must be at least 8 characters').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('establishment.name').trim().notEmpty().withMessage('Establishment name is required'),
  body('establishment.tradeName').trim().notEmpty().withMessage('Trade name is required'),
  body('establishment.yearOfEstablishment').notEmpty().withMessage('Year of establishment is required').isInt({ min: 1800, max: new Date().getFullYear() }).withMessage('Year must be between 1800 and current year'),
  body('establishment.officialClassification').notEmpty().withMessage('Official classification is required').isIn(['Proprietorship', 'Partnership', 'Private Limited', 'Public Limited', 'LLP', 'Other']).withMessage('Invalid official classification'),
  body('establishment.businessType').notEmpty().withMessage('Business type is required').isIn(['Retail', 'Wholesale', 'Service', 'Manufacturing', 'Trading', 'Other']).withMessage('Invalid business type'),
  body('establishment.officialEmail').trim().notEmpty().withMessage('Official email is required').isEmail().withMessage('Please provide a valid official email').normalizeEmail(),
  body('location.district').trim().notEmpty().withMessage('District is required'),
  body('location.region').trim().notEmpty().withMessage('Region is required'),
  body('location.city').trim().notEmpty().withMessage('City is required'),
  body('location.pinCode').trim().notEmpty().withMessage('Pin code is required').matches(/^6\d{5}$/).withMessage('Pin code must be 6 digits starting with 6'),
  body('location.registeredAddress').trim().notEmpty().withMessage('Registered address is required'),
  body('member.officeType').notEmpty().withMessage('Office type is required').isIn(['Head Office', 'Branch Office', 'Regional Office', 'Other']).withMessage('Invalid office type'),
  body('member.roleInAgency').notEmpty().withMessage('Member role is required').isIn(['Owner', 'Partner', 'Director', 'Manager', 'Authorized Representative', 'Other']).withMessage('Invalid role in agency'),
  body('member.fullName').trim().notEmpty().withMessage('Member name is required'),
  body('member.dateOfBirth').notEmpty().withMessage('Date of birth is required').isISO8601().withMessage('Please provide a valid date'),
  body('member.mobile').trim().notEmpty().withMessage('Mobile number is required').matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit mobile number'),
];

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map((err) => err.msg);
    const error = new ApiError(400, 'Validation failed');
    error.errors = extractedErrors;
    throw error;
  }
  next();
};
