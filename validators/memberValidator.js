const { body, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Approval/Rejection Validation Rules
exports.approvalValidationRules = [
  body('action')
    .trim()
    .notEmpty().withMessage('Action is required')
    .isIn(['approve', 'reject']).withMessage('Action must be either "approve" or "reject"'),

  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Remarks must not exceed 500 characters'),
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
