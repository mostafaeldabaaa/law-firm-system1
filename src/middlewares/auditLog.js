const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Audit logging middleware factory.
 * Usage: auditLog('CASE_CREATED', 'cases')
 *
 * Attaches itself to res.on('finish') so it logs the *actual* outcome
 * (status code) of the request, not just the fact that it was attempted.
 * Failures to write the audit log are logged but never block the response.
 */
const auditLog = (action, resource) => {
  return (req, res, next) => {
    res.on('finish', async () => {
      try {
        await AuditLog.create({
          user: req.user ? req.user._id : null,
          action,
          resource,
          resourceId: req.params.id || req.auditResourceId || null,
          method: req.method,
          endpoint: req.originalUrl,
          statusCode: res.statusCode,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: {
            body: sanitizeBody(req.body),
          },
        });
      } catch (err) {
        logger.error(`Failed to write audit log for action ${action}: ${err.message}`);
      }
    });
    next();
  };
};

// Strip sensitive fields before persisting request body to the audit trail
const sanitizeBody = (body = {}) => {
  const clone = { ...body };
  delete clone.password;
  delete clone.newPassword;
  delete clone.currentPassword;
  delete clone.token;
  return clone;
};

module.exports = auditLog;
