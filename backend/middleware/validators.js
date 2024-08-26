const { body, validationResult } = require('express-validator');

const validateTimeEntry = [
  body('telegramId').isInt().withMessage('Invalid Telegram ID'),
  body('firstName').isString().notEmpty().withMessage('First name is required'),
  body('lastName').isString().optional(),
];

const validatePayment = [
  body('entryId').isMongoId().withMessage('Invalid time entry ID'),
  body('amount').isFloat({ min: 0 }).withMessage('Invalid payment amount'),
];

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  };  

module.exports = {
  validateTimeEntry,
  validatePayment,
  handleValidationErrors,
};