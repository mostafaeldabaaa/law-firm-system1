const { body } = require('express-validator');
const { DEADLINE_TYPES, DEADLINE_STATUSES } = require('../models/LegalDeadline');

const createDeadlineValidator = [
  body('case').isMongoId().withMessage('validation.caseIdRequired'),
  body('type').isIn(DEADLINE_TYPES).withMessage('validation.deadlineTypeInvalid'),
  body('title').trim().notEmpty().withMessage('validation.deadlineTitleRequired'),
  body('dueDate').isISO8601().withMessage('validation.dueDateRequired'),
  body('responsibleLawyer').isMongoId().withMessage('validation.lawyerIdRequired'),
  body('reminderLeadDays')
    .optional()
    .isArray()
    .withMessage('validation.reminderLeadDaysArray'),
];

const updateDeadlineStatusValidator = [
  body('status').isIn(DEADLINE_STATUSES).withMessage('validation.deadlineStatusInvalid'),
  body('completionNote').optional().isString(),
];

module.exports = { createDeadlineValidator, updateDeadlineStatusValidator };
