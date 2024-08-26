const { body, param, validationResult } = require('express-validator');

const validateTimeEntry = [
  body('clockIn')
    .optional()
    .isISO8601()
    .withMessage('Invalid clock-in time format'),
  body('clockOut')
    .optional()
    .isISO8601()
    .withMessage('Invalid clock-out time format'),
];

const validatePayment = [
  body('entryId')
    .isMongoId()
    .withMessage('Invalid time entry ID'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Invalid payment amount'),
];

const validateEntryReview = [
  body('entryId')
    .isMongoId()
    .withMessage('Invalid time entry ID'),
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Invalid status'),
];

const validateDateRange = [
  body('startDate')
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('endDate')
    .isISO8601()
    .withMessage('Invalid end date format'),
];

const validateUserId = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  validateTimeEntry,
  validatePayment,
  validateEntryReview,
  validateDateRange,
  validateUserId,
  handleValidationErrors,
};