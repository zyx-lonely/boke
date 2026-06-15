const { logger } = require('./logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  logger.error(`${statusCode} - ${message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(statusCode).json({
    error: {
      status: statusCode,
      message: message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { errorHandler, notFound, AppError };