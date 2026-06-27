const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * express-validator's withMessage() stores either:
 *   - a plain translation key, e.g. "validation.passwordLength"
 *   - a key with interpolation params, e.g. "validation.roleInvalid|{\"roles\":\"a, b\"}"
 * This parses both shapes and returns the translated string for the
 * request's resolved locale.
 */
const translateValidatorMessage = (req, rawMessage) => {
  if (typeof rawMessage !== 'string') return rawMessage;

  const [key, paramsJson] = rawMessage.split('|');
  let params = {};

  if (paramsJson) {
    try {
      params = JSON.parse(paramsJson);
    } catch {
      params = {};
    }
  }

  return req.t(key, params);
};

/**
 * Runs after express-validator's check chains.
 * Collects any validation errors, translates each message key into
 * the request's locale, and forwards a single, consistent AppError
 * to the global error handler instead of each controller having to
 * check validationResult() manually.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const formatted = errors.array().map((e) => ({
    field: e.path,
    message: translateValidatorMessage(req, e.msg),
  }));

  return next(new AppError(req.t('validation.failed'), 422, formatted));
};

module.exports = validate;
