const { body, param, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// Message validation rules
const validateMessage = [
  body('sessionId')
    .isUUID()
    .withMessage('Valid session ID is required'),
  body('message')
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  validate
];

// Session validation rules
const validateSession = [
  param('sessionId')
    .isUUID()
    .withMessage('Valid session ID is required'),
  validate
];

module.exports = {
  validateMessage,
  validateSession
};
