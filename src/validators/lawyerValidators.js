const { body } = require('express-validator');

const createLawyerValidator = [
  body('user').isMongoId().withMessage('validation.lawyerUserIdRequired'),
  body('barNumber').trim().notEmpty().withMessage('validation.barNumberRequired'),
  body('specialties').optional().isArray().withMessage('validation.specialtiesArray'),
  body('yearsOfExperience').optional().isInt({ min: 0 }).withMessage('validation.yearsNonNegative'),
  body('hourlyRate').optional().isFloat({ min: 0 }).withMessage('validation.hourlyRateNonNegative'),
];

const updateLawyerValidator = [
  body('specialties').optional().isArray().withMessage('validation.specialtiesArray'),
  body('yearsOfExperience').optional().isInt({ min: 0 }).withMessage('validation.yearsNonNegative'),
  body('hourlyRate').optional().isFloat({ min: 0 }).withMessage('validation.hourlyRateNonNegative'),
  body('isAvailable').optional().isBoolean().withMessage('validation.isAvailableBoolean'),
];

module.exports = { createLawyerValidator, updateLawyerValidator };
