const express = require('express');
const router = express.Router();
const { getAllRequests, getRequestDetails, reviewRequest } = require('../controllers/adminProfileController');
const {
  getAllRequestsValidationRules,
  getRequestDetailsValidationRules,
  reviewRequestValidationRules,
  validate,
} = require('../validators/adminProfileValidator');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticateAdmin } = require('../middlewares/authMiddleware');

// All routes require admin authentication
router.use(authenticateAdmin);

// Get All Profile Change Requests
router.get(
  '/',
  getAllRequestsValidationRules,
  validate,
  asyncHandler(getAllRequests)
);

// Get Detailed Profile Change Request
router.get(
  '/:userId',
  getRequestDetailsValidationRules,
  validate,
  asyncHandler(getRequestDetails)
);

// Review Profile Change Request (Approve/Reject)
router.put(
  '/:userId/review',
  reviewRequestValidationRules,
  validate,
  asyncHandler(reviewRequest)
);

module.exports = router;
