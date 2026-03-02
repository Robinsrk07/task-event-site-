const express = require('express');
const router = express.Router();
const {
    registerForEventController,
    verifyEventRegistrationController,
    getMyEventsController
} = require('../controllers/memberEventController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticateMember } = require('../middlewares/authMiddleware');

/**
 * Member Routes - Event Registration
 */

// Register for an event (Initiate)
router.post('/register/:eventId', authenticateMember, asyncHandler(registerForEventController));

// Verify registration payment
router.post('/verify-payment', authenticateMember, asyncHandler(verifyEventRegistrationController));

// Get member's registered events
router.get('/my-events', authenticateMember, asyncHandler(getMyEventsController));

module.exports = router;
