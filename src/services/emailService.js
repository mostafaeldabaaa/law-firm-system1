const path = require('path');
const ejs = require('ejs');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Centralized email delivery (Nodemailer + EJS templates).
 *
 * Improvements over a typical bare nodemailer setup:
 *   - ONE transporter, built once and reused, instead of creating a
 *     new SMTP connection on every single email sent.
 *   - Templates are bilingual: every render call receives `locale`
 *     and `dir` so the same .ejs file produces a correct RTL Arabic
 *     or LTR English email depending on the recipient's resolved
 *     language (see middlewares/detectLocale.js) — there's no
 *     separate ar/en template file to keep in sync.
 *   - Failures are caught and logged by the caller (see
 *     authController.js): a transient email outage should never
 *     crash a signup/password-reset request that otherwise succeeded.
 *
 * If SMTP isn't configured, sendMail throws immediately with a clear
 * message rather than hanging — callers decide whether that's fatal
 * (e.g. OTP delivery, where failing silently would leave the user
 * stuck) or safe to swallow (e.g. a "welcome" email).
 */

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing).');
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465, // true for port 465, false for 587/STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
};

const renderTemplate = async (templateName, data) => {
  const templatePath = path.join(__dirname, '../views', `${templateName}.ejs`);
  return ejs.renderFile(templatePath, data);
};

/**
 * Sends an arbitrary pre-rendered (or simple) email. Used internally
 * by the higher-level helpers below; not exported, to keep template
 * rendering and delivery paired rather than letting callers build
 * arbitrary HTML by hand.
 */
const deliver = async ({ to, subject, html }) => {
  const from = process.env.SMTP_FROM || `"Law Firm System" <${process.env.SMTP_USER}>`;
  const info = await getTransporter().sendMail({ from, to, subject, html });
  logger.info(`Email sent to ${to}: ${subject} (messageId: ${info.messageId})`);
  return info;
};

/**
 * Sends the password-reset OTP email, localized to the given locale.
 */
const sendPasswordResetOTPEmail = async ({ to, otp, locale = 'en' }) => {
  const isArabic = locale === 'ar';

  const copy = isArabic
    ? {
        title: 'إعادة تعيين كلمة المرور',
        greeting: 'مرحباً،',
        instructions: 'لقد طلبت إعادة تعيين كلمة المرور. استخدم الرمز أدناه لإتمام العملية. صالح لمدة 15 دقيقة.',
        expiryNotice: 'ينتهي صلاحية هذا الرمز خلال 15 دقيقة.',
        ignoreNotice: 'إذا لم تطلب ذلك، يمكنك تجاهل هذا البريد بأمان.',
        rightsReserved: 'جميع الحقوق محفوظة.',
      }
    : {
        title: 'Reset Your Password',
        greeting: 'Hello,',
        instructions:
          'We received a request to reset your password. Use the code below to complete the process. It is valid for 15 minutes.',
        expiryNotice: 'This code expires in 15 minutes.',
        ignoreNotice: "If you didn't request this, you can safely ignore this email.",
        rightsReserved: 'All rights reserved.',
      };

  const html = await renderTemplate('reset-password-otp', {
    ...copy,
    otp,
    locale,
    dir: isArabic ? 'rtl' : 'ltr',
    firmName: 'Enterprise Law Firm',
    year: new Date().getFullYear(),
  });

  return deliver({
    to,
    subject: isArabic ? 'رمز إعادة تعيين كلمة المرور' : 'Your Password Reset Code',
    html,
  });
};

/**
 * Sends the welcome email after successful signup, localized.
 */
const sendWelcomeEmail = async ({ to, name, locale = 'en' }) => {
  const isArabic = locale === 'ar';

  const copy = isArabic
    ? {
        title: 'مرحباً بك',
        greeting: `مرحباً ${name}،`,
        welcomeMessage: 'تم إنشاء حسابك بنجاح في نظام إدارة مكتب المحاماة. يمكنك الآن الوصول إلى لوحة التحكم الخاصة بك.',
        ctaLabel: 'الذهاب إلى لوحة التحكم',
        rightsReserved: 'جميع الحقوق محفوظة.',
      }
    : {
        title: 'Welcome',
        greeting: `Hello ${name},`,
        welcomeMessage:
          'Your account has been created successfully in the Law Firm Management System. You can now access your dashboard.',
        ctaLabel: 'Go to Dashboard',
        rightsReserved: 'All rights reserved.',
      };

  const html = await renderTemplate('welcome', {
    ...copy,
    locale,
    dir: isArabic ? 'rtl' : 'ltr',
    firmName: 'Enterprise Law Firm',
    dashboardUrl: process.env.DASHBOARD_URL || '#',
    year: new Date().getFullYear(),
  });

  return deliver({
    to,
    subject: isArabic ? `مرحباً بك، ${name}` : `Welcome, ${name}`,
    html,
  });
};

module.exports = { sendPasswordResetOTPEmail, sendWelcomeEmail };
