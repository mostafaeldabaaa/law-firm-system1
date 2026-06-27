const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { translate } = require('../utils/i18n');

// --- Helpers to translate known error types into AppError ---

const handleCastErrorDB = (err) =>
  new AppError(`Invalid ${err.path}: ${err.value}`, 400);

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0];
  const value = err.keyValue ? err.keyValue[field] : '';
  return new AppError(`Duplicate value '${value}' for field '${field}'. Please use another value.`, 409);
};

const handleValidationErrorDB = (err) => {
  const messages = Object.values(err.errors).map((el) => el.message);
  return new AppError(`Invalid input data: ${messages.join('. ')}`, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpiredError = () =>
  new AppError('Your session has expired. Please log in again.', 401);

const sendDevError = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

const sendProdError = (err, req, res) => {
  // Operational, trusted error: safe to send the message to the client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Programming or unknown error: don't leak details
  logger.error('UNEXPECTED ERROR 💥', { message: err.message, stack: err.stack });
  return res.status(500).json({
    success: false,
    status: 'error',
    message: translate(req.locale, 'general.serverError'),
  });
};

/**
 * Global error-handling middleware. Must be registered last,
 * after all routes, in app.js.
 */
// eslint-disable-next-line no-unused-vars
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    logger.error(err.message, { stack: err.stack });
    return sendDevError(err, res);
  }

  let error = { ...err, message: err.message, name: err.name };

  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  if (!error.isOperational) {
    error = new AppError(error.message || 'Internal server error', error.statusCode || 500);
  }

  sendProdError(error, req, res);
};

module.exports = globalErrorHandler;
