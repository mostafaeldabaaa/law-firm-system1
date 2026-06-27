const mongoose = require('mongoose');

/**
 * Audit Log: immutable record of sensitive actions across the system.
 * Written by the auditLogger middleware/service — never updated or
 * deleted through the normal API, only ever appended to.
 */
const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for unauthenticated attempts (e.g. failed logins)
    },
    action: {
      type: String,
      required: true,
      // e.g. 'USER_LOGIN', 'CASE_CREATED', 'CASE_UPDATED', 'DOCUMENT_DOWNLOADED'
    },
    resource: {
      type: String,
      required: true, // e.g. 'cases', 'users', 'documents'
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    method: String, // HTTP method
    endpoint: String, // route path
    statusCode: Number,
    ipAddress: String,
    userAgent: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ action: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
