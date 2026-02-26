const { body, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Verify Payment Validation Rules
exports.verifyPaymentValidationRules = [
  body('razorpay_order_id')
    .notEmpty().withMessage('Razorpay order ID is required')
    .isString().withMessage('Order ID must be a string'),

  body('razorpay_payment_id')
    .notEmpty().withMessage('Razorpay payment ID is required')
    .isString().withMessage('Payment ID must be a string'),

  body('razorpay_signature')
    .notEmpty().withMessage('Razorpay signature is required')
    .isString().withMessage('Signature must be a string'),
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
