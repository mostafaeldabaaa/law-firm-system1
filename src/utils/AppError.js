/**
 * Custom error class for predictable, operational errors
 * (e.g. validation failures, not found, unauthorized).
 * Distinguishing these from programming errors lets the global
 * error handler decide what is safe to expose to the client.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
