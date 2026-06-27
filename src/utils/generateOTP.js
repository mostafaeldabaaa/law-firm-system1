/**
 * Generates a 6-digit numeric OTP (one-time password) for password
 * reset, e.g. 482913. Always returns a string padded to 6 digits so
 * the email template and validators can rely on a fixed-length code
 * even on the rare draw that lands under 100000.
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = { generateOTP };
