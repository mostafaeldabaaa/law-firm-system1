const { body } = require('express-validator');
const { CONSULTATION_STATUSES } = require('../models/Consultation');

const createConsultationValidator = [
  body('client').isMongoId().withMessage('validation.clientIdRequired'),
  body('subject').trim().notEmpty().withMessage('validation.consultationSubjectRequired'),
  body('description').trim().notEmpty().withMessage('validation.consultationDescriptionRequired'),
  body('category').optional().isString(),
  body('preferredLawyer').optional().isMongoId().withMessage('validation.lawyerIdRequired'),
];

const addMessageValidator = [
  body('text').trim().notEmpty().withMessage('validation.commentTextRequired'),
];

const assignLawyerValidator = [
  body('assignedLawyer').isMongoId().withMessage('validation.lawyerIdRequired'),
];

const updateConsultationStatusValidator = [
  body('status').isIn(CONSULTATION_STATUSES).withMessage('validation.consultationStatusInvalid'),
];

module.exports = {
  createConsultationValidator,
  addMessageValidator,
  assignLawyerValidator,
  updateConsultationStatusValidator,
};
