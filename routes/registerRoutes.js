const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { register } = require('../controllers/registerController');
const { registerValidationRules, validate } = require('../validators/registerValidator');
const asyncHandler = require('../middlewares/asyncHandler');

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many registration attempts from this IP. Please try again after 15 minutes.',
});

router.post(
  '/',
  registerLimiter,
  registerValidationRules,
  validate,
  asyncHandler(register)
);

module.exports = router;
