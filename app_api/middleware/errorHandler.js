const logger = require('../config/logger');

// Centralized error handling middleware
const errorHandler = (err, req, res, next) => {
  // Default to 500 server error
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log the error
  if (err.statusCode >= 500) {
    logger.error('Server Error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method
    });
  } else {
    logger.warn('Client Error:', {
      message: err.message,
      statusCode: err.statusCode,
      url: req.originalUrl,
      method: req.method
    });
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Send error response
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    ...(isDevelopment && { stack: err.stack })
  });
};

module.exports = errorHandler;