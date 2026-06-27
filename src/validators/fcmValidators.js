const { body } = require('express-validator');

const registerFcmTokenValidator = [
  body('token').trim().notEmpty().withMessage('validation.fcmTokenRequired'),
  body('device').optional().isIn(['web', 'android', 'ios', 'unknown']).withMessage('validation.fcmDeviceInvalid'),
];

const removeFcmTokenValidator = [
  body('token').trim().notEmpty().withMessage('validation.fcmTokenRequired'),
];

module.exports = { registerFcmTokenValidator, removeFcmTokenValidator };
