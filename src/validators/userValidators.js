const { body } = require('express-validator');
const { ROLES } = require('../models/User');

const createUserValidator = [
  body('firstName').trim().notEmpty().withMessage('validation.firstNameRequired'),
  body('lastName').trim().notEmpty().withMessage('validation.lastNameRequired'),
  body('email').isEmail().withMessage('validation.emailRequired').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('validation.passwordLength'),
  body('role')
    .optional()
    .isIn(ROLES)
    .withMessage(`validation.roleInvalid|${JSON.stringify({ roles: ROLES.join(', ') })}`),
];

module.exports = { createUserValidator };
