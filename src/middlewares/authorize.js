const AppError = require('../utils/AppError');
const { can } = require('../config/permissions');

/**
 * Authorization middleware factory.
 * Usage: authorize('cases', 'delete')
 *
 * Looks up the permissions matrix to decide whether req.user.role
 * is allowed to perform `action` on `resource`. Must run after `protect`.
 */
const authorize = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(req.t('authorization.authRequired'), 401));
    }

    const allowed = can(req.user.role, resource, action);

    if (!allowed) {
      return next(
        new AppError(
          req.t('authorization.notPermitted', { role: req.user.role, action, resource }),
          403
        )
      );
    }

    next();
  };
};

/**
 * Restricts access to a fixed list of roles, regardless of the
 * permissions matrix. Useful for endpoints that aren't resource-shaped
 * (e.g. system settings, tenant management).
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(req.t('authorization.noPermission'), 403));
    }
    next();
  };
};

module.exports = { authorize, restrictTo };
