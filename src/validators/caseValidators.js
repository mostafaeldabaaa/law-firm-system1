const { body } = require('express-validator');
const { CASE_STATUSES } = require('../models/Case');

const createCaseValidator = [
  body('title').trim().notEmpty().withMessage('validation.caseTitleRequired'),
  body('caseType').trim().notEmpty().withMessage('validation.caseTypeRequired'),
  body('client').isMongoId().withMessage('validation.clientIdRequired'),
  body('leadLawyer').isMongoId().withMessage('validation.leadLawyerIdRequired'),
  body('assignedLawyers').optional().isArray().withMessage('validation.assignedLawyersArray'),
  body('estimatedValue').optional().isFloat({ min: 0 }).withMessage('validation.estimatedValueNonNegative'),
];

const updateCaseStatusValidator = [
  body('status')
    .isIn(CASE_STATUSES)
    .withMessage(`validation.caseStatusInvalid|${JSON.stringify({ statuses: CASE_STATUSES.join(', ') })}`),
  body('note').optional().isString().withMessage('validation.noteMustBeString'),
];

const addCaseNoteValidator = [
  body('description').trim().notEmpty().withMessage('validation.noteDescriptionRequired'),
];

module.exports = { createCaseValidator, updateCaseStatusValidator, addCaseNoteValidator };
