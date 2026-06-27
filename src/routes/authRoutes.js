const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const protect = require('../middlewares/protect');
const validate = require('../middlewares/validate');
const auditLog = require('../middlewares/auditLog');
const {
  registerValidator,
  loginValidator,
  updatePasswordValidator,
  forgotPasswordValidator,
  verifyResetOTPValidator,
  resetPasswordValidator,
} = require('../validators/authValidators');

const router = express.Router();

// Tighter limiter specifically for OTP verification, since a 6-digit
// numeric code is brute-forceable in well under a million attempts —
// this caps guesses per IP far below what the underlying auth-route
// limiter (defined in app.js) would otherwise allow.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

router.post(
  '/register',
  registerValidator,
  validate,
  auditLog('USER_REGISTERED', 'users'),
  authController.register
);

router.post(
  '/login',
  loginValidator,
  validate,
  auditLog('USER_LOGIN', 'users'),
  authController.login
);

router.post('/refresh-token', authController.refreshToken);

// --- Password reset via OTP (public — the user is, by definition,
// not logged in at this point) ---
router.post(
  '/forgot-password',
  otpLimiter,
  forgotPasswordValidator,
  validate,
  auditLog('PASSWORD_RESET_REQUESTED', 'users'),
  authController.forgotPassword
);

router.post(
  '/verify-reset-otp',
  otpLimiter,
  verifyResetOTPValidator,
  validate,
  authController.verifyResetOTP
);

router.post(
  '/reset-password',
  otpLimiter,
  resetPasswordValidator,
  validate,
  auditLog('PASSWORD_RESET_COMPLETED', 'users'),
  authController.resetPassword
);

// Below this line, all routes require a valid access token
router.use(protect);

router.post('/logout', auditLog('USER_LOGOUT', 'users'), authController.logout);
router.get('/me', authController.getMe);
router.patch(
  '/update-password',
  updatePasswordValidator,
  validate,
  auditLog('PASSWORD_UPDATED', 'users'),
  authController.updatePassword
);

module.exports = router;
