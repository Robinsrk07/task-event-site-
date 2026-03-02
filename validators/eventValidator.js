const { body, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Create Event Validation Rules
exports.createEventValidationRules = [
  // Basic Info
  body('title')
    .trim()
    .notEmpty().withMessage('Event title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Event description is required')
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),

  body('eventType')
    .trim()
    .notEmpty().withMessage('Event type is required')
    .isIn(['Annual Meet', 'FAM Trip', 'Training', 'Workshop', 'Seminar', 'Conference', 'Other'])
    .withMessage('Invalid event type'),

  // Event Date
  body('eventDate.startDate')
    .notEmpty().withMessage('Event start date is required')
    .isISO8601().withMessage('Invalid start date format'),

  body('eventDate.endDate')
    .notEmpty().withMessage('Event end date is required')
    .isISO8601().withMessage('Invalid end date format'),

  body('eventDate.startTime')
    .trim()
    .notEmpty().withMessage('Event start time is required'),

  body('eventDate.endTime')
    .trim()
    .notEmpty().withMessage('Event end time is required'),

  // Venue
  body('venue.name')
    .trim()
    .notEmpty().withMessage('Venue name is required'),

  body('venue.address')
    .trim()
    .notEmpty().withMessage('Venue address is required'),

  body('venue.city')
    .trim()
    .notEmpty().withMessage('City is required'),

  // Registration
  body('registration.deadline')
    .notEmpty().withMessage('Registration deadline is required')
    .isISO8601().withMessage('Invalid deadline format'),

  body('registration.maxCapacity')
    .notEmpty().withMessage('Max capacity is required')
    .isInt({ min: 1 }).withMessage('Capacity must be at least 1'),

  body('registration.isFree')
    .optional()
    .isBoolean().withMessage('isFree must be a boolean'),

  body('registration.fee')
    .if(body('registration.isFree').equals('false'))
    .notEmpty().withMessage('Registration fee is required for paid events')
    .isFloat({ min: 0 }).withMessage('Fee cannot be negative'),

  body('registration.fee')
    .if(body('registration.isFree').equals('true'))
    .custom((value, { req }) => {
      if (value !== undefined && value !== 0) {
        throw new Error('Fee must be 0 for free events');
      }
      return true;
    }),

  body('registration.earlyBirdFee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Early bird fee cannot be negative'),

  // Organizer
  body('organizer.contactPerson')
    .trim()
    .notEmpty().withMessage('Contact person is required'),

  body('organizer.contactEmail')
    .trim()
    .notEmpty().withMessage('Contact email is required')
    .isEmail().withMessage('Invalid email format'),

  body('organizer.contactPhone')
    .trim()
    .notEmpty().withMessage('Contact phone is required')
    .isMobilePhone('en-IN').withMessage('Invalid phone number'),

  // Status (optional)
  body('status')
    .optional()
    .isIn(['draft', 'published', 'ongoing', 'completed'])
    .withMessage('Invalid status'),
];

// Update Event Validation Rules (All fields optional for PATCH)
exports.updateEventValidationRules = [
  // Basic Info (optional)
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Event title cannot be empty')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),

  body('description')
    .optional()
    .trim()
    .notEmpty().withMessage('Event description cannot be empty')
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),

  body('eventType')
    .optional()
    .trim()
    .isIn(['Annual Meet', 'FAM Trip', 'Training', 'Workshop', 'Seminar', 'Conference', 'Other'])
    .withMessage('Invalid event type'),

  // Event Date (optional)
  body('eventDate.startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),

  body('eventDate.endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format'),

  body('eventDate.startTime')
    .optional()
    .trim()
    .notEmpty().withMessage('Start time cannot be empty'),

  body('eventDate.endTime')
    .optional()
    .trim()
    .notEmpty().withMessage('End time cannot be empty'),

  // Venue (optional)
  body('venue.name')
    .optional()
    .trim()
    .notEmpty().withMessage('Venue name cannot be empty'),

  body('venue.address')
    .optional()
    .trim()
    .notEmpty().withMessage('Venue address cannot be empty'),

  body('venue.city')
    .optional()
    .trim()
    .notEmpty().withMessage('City cannot be empty'),

  // Registration (optional)
  body('registration.isOpen')
    .optional()
    .isBoolean().withMessage('isOpen must be boolean'),

  body('registration.deadline')
    .optional()
    .isISO8601().withMessage('Invalid deadline format'),

  body('registration.maxCapacity')
    .optional()
    .isInt({ min: 1 }).withMessage('Capacity must be at least 1'),

  body('registration.fee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Fee cannot be negative'),

  body('registration.earlyBirdFee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Early bird fee cannot be negative'),

  // Organizer (optional)
  body('organizer.contactEmail')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format'),

  body('organizer.contactPhone')
    .optional()
    .trim()
    .isMobilePhone('en-IN').withMessage('Invalid phone number'),

  // Status (optional)
  body('status')
    .optional()
    .isIn(['draft', 'published', 'ongoing', 'completed'])
    .withMessage('Invalid status'),
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
