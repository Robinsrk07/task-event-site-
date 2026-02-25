const express = require('express');
const router = express.Router();
const { createEventController, getAllEventsController, getEventDetailsController, updateEventController, deleteEventController } = require('../controllers/eventController');
const { createEventValidationRules, updateEventValidationRules, validate } = require('../validators/eventValidator');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticateAdmin } = require('../middlewares/authMiddleware');

// Admin Routes - Event Management

// Create Event
router.post('/', authenticateAdmin, createEventValidationRules, validate, asyncHandler(createEventController));

// Get All Events (Admin view)
router.get('/', authenticateAdmin, asyncHandler(getAllEventsController));

// Get Single Event Details
router.get('/:id', authenticateAdmin, asyncHandler(getEventDetailsController));

// Update Event
router.patch('/:id', authenticateAdmin, updateEventValidationRules, validate, asyncHandler(updateEventController));

// Delete Event
router.delete('/:id', authenticateAdmin, asyncHandler(deleteEventController));

module.exports = router;
