const { Case, ALLOWED_TRANSITIONS } = require('../models/Case');
const AppError = require('../utils/AppError');

/**
 * Generates a human-readable, sequential case number per year,
 * e.g. CASE-2026-000123. Uses a count-based approach for simplicity;
 * at very high write concurrency this would be replaced by an atomic
 * counter collection, but is sufficient for this system's scale.
 */
const generateCaseNumber = async () => {
  const year = new Date().getFullYear();
  const countThisYear = await Case.countDocuments({
    caseNumber: new RegExp(`^CASE-${year}-`),
  });
  const sequence = String(countThisYear + 1).padStart(6, '0');
  return `CASE-${year}-${sequence}`;
};

/**
 * Validates and applies a case status transition, appending a timeline
 * event. Throws an AppError (rather than failing silently) if the
 * transition isn't allowed by the workflow defined in models/Case.js.
 *
 * `t` is the request's translation function (req.t), passed in so this
 * service stays decoupled from the Express request object while still
 * producing a localized error message.
 */
const transitionCaseStatus = async (caseDoc, newStatus, userId, note = '', t = (k) => k) => {
  if (!caseDoc.canTransitionTo(newStatus)) {
    const allowed = ALLOWED_TRANSITIONS[caseDoc.status].join(', ') || t('case.terminalState');
    throw new AppError(
      t('case.invalidTransition', { from: caseDoc.status, to: newStatus, allowed }),
      400
    );
  }

  const previousStatus = caseDoc.status;
  caseDoc.status = newStatus;

  if (newStatus === 'closed') {
    caseDoc.closedAt = new Date();
  }

  caseDoc.timeline.push({
    type: 'STATUS_CHANGE',
    description: `Case status changed from '${previousStatus}' to '${newStatus}'${note ? `: ${note}` : ''}`,
    performedBy: userId,
    metadata: { previousStatus, newStatus },
  });

  await caseDoc.save();
  return caseDoc;
};

module.exports = { generateCaseNumber, transitionCaseStatus };
