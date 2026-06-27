const jwt = require('jsonwebtoken');

/**
 * Generates a short-lived access token carrying the user's id and role.
 * Keeping the role in the token avoids an extra DB lookup on every
 * authorize() check, at the cost of the role being "frozen" until
 * the token is refreshed — an explicit, documented trade-off.
 */
const signAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

/**
 * Generates a long-lived refresh token used solely to mint new
 * access tokens. Stored server-side (on the user doc) so it can be
 * revoked on logout or password change.
 */
const signRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

module.exports = { signAccessToken, signRefreshToken, verifyRefreshToken };
