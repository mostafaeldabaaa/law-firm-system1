const bcrypt = require('bcryptjs');
const { User } = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const logger = require('../utils/logger');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../services/authService');
const { generateOTP } = require('../utils/generateOTP');
const { sendPasswordResetOTPEmail, sendWelcomeEmail } = require('../services/emailService');

const OTP_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes, matching the email copy

/**
 * POST /api/v1/auth/register
 * Public self-registration creates a 'client' by default.
 * Staff accounts (lawyer, secretary, branch_manager, super_admin) should
 * be created via the protected /api/v1/users endpoint by an admin,
 * not through this open endpoint — prevents privilege escalation at signup.
 */
const register = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password, phone } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return next(new AppError(req.t('auth.emailExists'), 409));
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    phone,
    role: 'client', // force-ignore any role sent by the client on public signup
  });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.refreshTokens.push({ token: refreshToken, userAgent: req.headers['user-agent'], ip: req.ip });
  await user.save({ validateBeforeSave: false });

  // Welcome email is best-effort: a transient SMTP outage must never
  // turn an otherwise-successful signup into a failed request.
  sendWelcomeEmail({ to: user.email, name: user.firstName, locale: req.locale }).catch((err) => {
    logger.error(`Welcome email failed for ${user.email}: ${err.message}`);
  });

  sendResponse(res, 201, {
    message: req.t('auth.registerSuccess'),
    data: { user: user.toSafeObject(), accessToken, refreshToken },
  });
});

/**
 * POST /api/v1/auth/login
 */
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError(req.t('auth.invalidCredentials'), 401));
  }

  if (!user.isActive) {
    return next(new AppError(req.t('auth.accountDeactivated'), 403));
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.refreshTokens.push({ token: refreshToken, userAgent: req.headers['user-agent'], ip: req.ip });
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  sendResponse(res, 200, {
    message: req.t('auth.loginSuccess'),
    data: { user: user.toSafeObject(), accessToken, refreshToken },
  });
});

/**
 * POST /api/v1/auth/refresh-token
 * Exchanges a valid, still-recognized refresh token for a new access token.
 */
const refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken: token } = req.body;
  if (!token) return next(new AppError(req.t('auth.refreshTokenRequired'), 400));

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (err) {
    return next(new AppError(req.t('auth.refreshTokenInvalid'), 401));
  }

  const user = await User.findById(decoded.id);
  if (!user) return next(new AppError(req.t('auth.userNoLongerExists'), 401));

  const tokenExists = user.refreshTokens.some((rt) => rt.token === token);
  if (!tokenExists) {
    return next(new AppError(req.t('auth.refreshTokenRevoked'), 401));
  }

  const newAccessToken = signAccessToken(user);

  sendResponse(res, 200, {
    message: req.t('auth.tokenRefreshed'),
    data: { accessToken: newAccessToken },
  });
});

/**
 * POST /api/v1/auth/logout
 * Revokes the specific refresh token used by this device/session,
 * rather than wiping all sessions (so other devices stay logged in).
 */
const logout = catchAsync(async (req, res, next) => {
  const { refreshToken: token } = req.body;

  if (token) {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { refreshTokens: { token } },
    });
  }

  sendResponse(res, 200, { message: req.t('auth.logoutSuccess') });
});

/**
 * GET /api/v1/auth/me
 */
const getMe = catchAsync(async (req, res) => {
  sendResponse(res, 200, { data: { user: req.user.toSafeObject() } });
});

/**
 * PATCH /api/v1/auth/update-password
 * For an already-authenticated user who knows their current password
 * (distinct from the forgot-password/OTP flow below, which is for
 * users who've lost access entirely).
 */
const updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError(req.t('auth.currentPasswordIncorrect'), 401));
  }

  user.password = newPassword;
  user.refreshTokens = []; // revoke all existing sessions on password change
  await user.save();

  const accessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);
  user.refreshTokens.push({ token: newRefreshToken, userAgent: req.headers['user-agent'], ip: req.ip });
  await user.save({ validateBeforeSave: false });

  sendResponse(res, 200, {
    message: req.t('auth.passwordUpdated'),
    data: { accessToken, refreshToken: newRefreshToken },
  });
});

/**
 * POST /api/v1/auth/forgot-password
 *
 * Step 1 of the OTP-based reset flow. Always responds with the same
 * generic success message whether or not the email is registered —
 * returning a different response for "email not found" would let an
 * attacker enumerate which emails have accounts, which is exactly the
 * kind of information leak a password-reset endpoint should never
 * provide. The actual side effect (sending an OTP) only happens for a
 * real, active account.
 */
const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email, isActive: true });

  if (user) {
    const otp = generateOTP();
    user.passwordResetOTP = await bcrypt.hash(otp, 10);
    user.passwordResetOTPExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    user.passwordResetVerified = false;
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetOTPEmail({ to: user.email, otp, locale: req.locale });
    } catch (err) {
      // Roll back the OTP so a failed-to-deliver code can't later be
      // "found" valid by a retry that assumes it was never set.
      user.passwordResetOTP = undefined;
      user.passwordResetOTPExpires = undefined;
      await user.save({ validateBeforeSave: false });
      logger.error(`Failed to send password reset OTP to ${email}: ${err.message}`);
      // Still return the generic success response below — we don't
      // want to reveal email-delivery failures to the caller either,
      // since that too would confirm the email is registered.
    }
  }

  sendResponse(res, 200, { message: req.t('auth.forgotPasswordGenericResponse') });
});

/**
 * POST /api/v1/auth/verify-reset-otp
 *
 * Step 2: the user proves they received the OTP. On success, we set
 * passwordResetVerified so the final resetPassword call can trust this
 * request actually came from someone who saw the code, without
 * requiring the OTP to be re-sent in the final step (better UX) while
 * still not allowing password reset on OTP knowledge alone forever —
 * see resetPassword, which immediately clears this flag.
 */
const verifyResetOTP = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select(
    '+passwordResetOTP +passwordResetOTPExpires +passwordResetVerified'
  );

  if (!user || !user.passwordResetOTP || !user.passwordResetOTPExpires) {
    return next(new AppError(req.t('auth.otpInvalidOrExpired'), 400));
  }

  if (user.passwordResetOTPExpires < new Date()) {
    return next(new AppError(req.t('auth.otpInvalidOrExpired'), 400));
  }

  const isValid = await bcrypt.compare(otp, user.passwordResetOTP);
  if (!isValid) {
    return next(new AppError(req.t('auth.otpInvalid'), 400));
  }

  user.passwordResetVerified = true;
  await user.save({ validateBeforeSave: false });

  sendResponse(res, 200, { message: req.t('auth.otpVerified') });
});

/**
 * POST /api/v1/auth/reset-password
 *
 * Step 3: sets the new password. Requires passwordResetVerified to
 * have been set by verifyResetOTP first — this is the gate that
 * prevents anyone who merely knows the (now-spent) OTP value from
 * resetting the password again later, and prevents skipping straight
 * to this endpoint without ever proving OTP ownership.
 */
const resetPassword = catchAsync(async (req, res, next) => {
  const { email, newPassword } = req.body;

  const user = await User.findOne({ email }).select(
    '+passwordResetVerified +passwordResetOTP +passwordResetOTPExpires'
  );

  if (!user) {
    return next(new AppError(req.t('auth.userNotFound'), 404));
  }

  if (!user.passwordResetVerified) {
    return next(new AppError(req.t('auth.otpVerificationRequired'), 400));
  }

  user.password = newPassword;
  user.passwordResetOTP = undefined;
  user.passwordResetOTPExpires = undefined;
  user.passwordResetVerified = false;
  user.refreshTokens = []; // revoke all existing sessions, same as updatePassword

  await user.save();

  sendResponse(res, 200, { message: req.t('auth.passwordResetSuccess') });
});

/**
 * GET /api/v1/auth/google/callback
 * Placeholder for a future Google OAuth integration (passport.js
 * would populate req.user before this handler runs). Not wired into
 * routes yet since it requires Google OAuth credentials to actually
 * function — kept here as the documented landing point so adding it
 * later is a routes + passport-config change, not a controller change.
 */
const googleCallback = catchAsync(async (req, res) => {
  const accessToken = signAccessToken(req.user);
  const refreshToken = signRefreshToken(req.user);

  req.user.refreshTokens.push({ token: refreshToken, userAgent: req.headers['user-agent'], ip: req.ip });
  await req.user.save({ validateBeforeSave: false });

  const redirectUrl = new URL(process.env.CLIENT_URL || 'http://localhost:3000/auth/callback');
  redirectUrl.searchParams.set('accessToken', accessToken);
  redirectUrl.searchParams.set('refreshToken', refreshToken);
  res.redirect(redirectUrl.toString());
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updatePassword,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  googleCallback,
};
