const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Protects routes by verifying the JWT access token sent in the
 * Authorization header ("Bearer <token>"). On success, attaches the
 * authenticated user document to req.user for downstream handlers.
 */
const protect = catchAsync(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next(new AppError(req.t('auth.notLoggedIn'), 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError(req.t('auth.invalidToken'), 401));
  }

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError(req.t('auth.userNotFoundToken'), 401));
  }

  if (!currentUser.isActive) {
    return next(new AppError(req.t('auth.accountDeactivated'), 403));
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError(req.t('auth.passwordChangedRecently'), 401));
  }

  req.user = currentUser;
  next();
});

module.exports = protect;
