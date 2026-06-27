const { body } = require('express-validator');

const createClientValidator = [
  body('fullName').trim().notEmpty().withMessage('validation.clientNameRequired'),
  body('type').optional().isIn(['individual', 'company']).withMessage('validation.clientTypeInvalid'),
  body('email').optional().isEmail().withMessage('validation.emailRequired'),
  body('assignedLawyer').optional().isMongoId().withMessage('validation.assignedLawyerInvalid'),
];

const updateClientValidator = [
  body('fullName').optional().trim().notEmpty().withMessage('validation.clientNameRequired'),
  body('email').optional().isEmail().withMessage('validation.emailRequired'),
  body('assignedLawyer').optional().isMongoId().withMessage('validation.assignedLawyerInvalid'),
  body('isActive').optional().isBoolean().withMessage('validation.isAvailableBoolean'),
];

module.exports = { createClientValidator, updateClientValidator };
