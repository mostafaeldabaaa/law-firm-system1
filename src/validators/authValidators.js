const { body } = require('express-validator');
const { ROLES } = require('../models/User');

/**
 * NOTE on i18n: withMessage() here stores a *translation key*
 * (e.g. 'validation.passwordLength'), not the final user-facing text.
 * The `validate` middleware translates each key via req.t() using the
 * request's resolved locale before sending the response. Roles are
 * passed as a `params` payload appended after a pipe ("key|json") since
 * express-validator only stores a plain string/object as the message —
 * see validate.js for how this is parsed back out.
 */

const registerValidator = [
  body('firstName').trim().notEmpty().withMessage('validation.firstNameRequired'),
  body('lastName').trim().notEmpty().withMessage('validation.lastNameRequired'),
  body('email').isEmail().withMessage('validation.emailRequired').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('validation.passwordLength'),
  body('role')
    .optional()
    .isIn(ROLES)
    .withMessage(`validation.roleInvalid|${JSON.stringify({ roles: ROLES.join(', ') })}`),
];

const loginValidator = [
  body('email').isEmail().withMessage('validation.emailRequired').normalizeEmail(),
  body('password').notEmpty().withMessage('validation.passwordRequired'),
];

const updatePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('validation.currentPasswordRequired'),
  body('newPassword').isLength({ min: 8 }).withMessage('validation.newPasswordLength'),
];

const forgotPasswordValidator = [
  body('email').isEmail().withMessage('validation.emailRequired').normalizeEmail(),
];

const verifyResetOTPValidator = [
  body('email').isEmail().withMessage('validation.emailRequired').normalizeEmail(),
  body('otp')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('validation.otpInvalid')
    .isNumeric()
    .withMessage('validation.otpInvalid'),
];

const resetPasswordValidator = [
  body('email').isEmail().withMessage('validation.emailRequired').normalizeEmail(),
  body('newPassword').isLength({ min: 8 }).withMessage('validation.newPasswordLength'),
];

module.exports = {
  registerValidator,
  loginValidator,
  updatePasswordValidator,
  forgotPasswordValidator,
  verifyResetOTPValidator,
  resetPasswordValidator,
};
