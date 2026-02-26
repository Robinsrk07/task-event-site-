const { body, param, query, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Get All Requests Validation
exports.getAllRequestsValidationRules = [
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'all'])
    .withMessage('Status must be one of: pending, approved, rejected, all'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

// Get Request Details Validation
exports.getRequestDetailsValidationRules = [
  param('userId')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid User ID format'),
];

// Review Request Validation
exports.reviewRequestValidationRules = [
  param('userId')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid User ID format'),

  body('action')
    .notEmpty().withMessage('Action is required')
    .isIn(['approve', 'reject']).withMessage('Action must be either "approve" or "reject"'),

  body('remarks')
    .optional()
    .isString().withMessage('Remarks must be a string')
    .isLength({ max: 500 }).withMessage('Remarks cannot exceed 500 characters'),

  // Custom validation: remarks required when rejecting
  body('remarks').custom((value, { req }) => {
    if (req.body.action === 'reject' && (!value || value.trim() === '')) {
      throw new Error('Remarks are required when rejecting a request');
    }
    return true;
  }),
];

// Validate middleware
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
