/**
 * Wraps an async route handler so any thrown/rejected error
 * is automatically forwarded to Express's error-handling middleware,
 * removing the need for repetitive try/catch blocks in controllers.
 *
 * Usage: router.get('/', catchAsync(controller.getAll));
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;
