const { body } = require('express-validator');

const createSessionValidator = [
  body('case').isMongoId().withMessage('validation.caseIdRequired'),
  body('title').trim().notEmpty().withMessage('validation.sessionTitleRequired'),
  body('lawyer').isMongoId().withMessage('validation.lawyerIdRequired'),
  body('startTime').isISO8601().withMessage('validation.startTimeRequired'),
  body('endTime').isISO8601().withMessage('validation.endTimeRequired'),
  body('type')
    .optional()
    .isIn(['court_hearing', 'client_meeting', 'internal_review', 'mediation'])
    .withMessage('validation.sessionTypeInvalid'),
];

const rescheduleSessionValidator = [
  body('startTime').isISO8601().withMessage('validation.startTimeRequired'),
  body('endTime').isISO8601().withMessage('validation.endTimeRequired'),
];

module.exports = { createSessionValidator, rescheduleSessionValidator };
