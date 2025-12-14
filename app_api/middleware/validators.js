const { body, validationResult } = require('express-validator');
const CustomError = require('../utils/customError');

// Validation rules for creating/updating trips
const validateTrip = [
  body('code')
    .trim()
    .notEmpty().withMessage('Trip code is required')
    .isLength({ min: 3, max: 20 }).withMessage('Trip code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9]+$/).withMessage('Trip code must contain only uppercase letters and numbers'),
  
  body('name')
    .trim()
    .notEmpty().withMessage('Trip name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Trip name must be between 3 and 100 characters')
    .escape(), // Sanitize HTML
  
  body('length')
    .notEmpty().withMessage('Trip length is required')
    .isInt({ min: 1, max: 365 }).withMessage('Trip length must be between 1 and 365 days'),
  
  body('start')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be a valid date'),
  
  body('resort')
    .trim()
    .notEmpty().withMessage('Resort name is required')
    .isLength({ max: 100 }).withMessage('Resort name must be less than 100 characters')
    .escape(),
  
  body('perPerson')
    .notEmpty().withMessage('Price per person is required')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  
  body('image')
    .trim()
    .notEmpty().withMessage('Image URL is required')
    .isURL().withMessage('Image must be a valid URL'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters')
    .escape()
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    throw new CustomError(errorMessages.join(', '), 400);
  }
  
  next();
};

module.exports = {
  validateTrip,
  handleValidationErrors
};