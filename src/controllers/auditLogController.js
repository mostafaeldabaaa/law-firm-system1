const AuditLog = require('../models/AuditLog');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');

/**
 * GET /api/v1/audit-logs
 * Super-admin-only visibility into the full audit trail, with filters
 * matching the spec: by user, action, resource, and date range.
 */
const getAuditLogs = catchAsync(async (req, res) => {
  const { user, action, resource, from, to, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (user) filter.user = user;
  if (action) filter.action = action;
  if (resource) filter.resource = resource;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('user', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    AuditLog.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: { logs },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
  });
});

module.exports = { getAuditLogs };
