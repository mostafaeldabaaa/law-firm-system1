// const express = require('express');
// const helmet = require('helmet');
// const cors = require('cors');
// const compression = require('compression');
// const morgan = require('morgan');
// const rateLimit = require('express-rate-limit');

// const apiRoutes = require('./routes');
// const AppError = require('./utils/AppError');
// const globalErrorHandler = require('./middlewares/errorHandler');
// const detectLocale = require('./middlewares/detectLocale');
// const { translate } = require('./utils/i18n');
// const logger = require('./utils/logger');

// const app = express();

// // --- Security middlewares ---
// app.use(helmet());
// app.use(cors());

// // --- Body parsing & compression (needed before locale detection reads req) ---
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true }));
// app.use(compression());

// // --- Language detection (?lang=ar or Accept-Language header) ---
// // Runs early so every downstream middleware (rate limiter, routes,
// // error handler) can use req.t() / req.locale.
// app.use(detectLocale);

// // --- Rate limiting (applied to the whole API) ---
// const limiter = rateLimit({
//   windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
//   max: Number(process.env.RATE_LIMIT_MAX) || 200,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: (req) => ({
//     success: false,
//     message: translate(req.locale, 'general.tooManyRequests'),
//   }),
// });
// app.use('/api', limiter);

// // --- Stricter limiter specifically for auth endpoints to slow brute force ---
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 20,
//   message: (req) => ({
//     success: false,
//     message: translate(req.locale, 'general.tooManyAuthAttempts'),
//   }),
// });
// app.use('/api/v1/auth/login', authLimiter);
// app.use('/api/v1/auth/register', authLimiter);

// // --- HTTP request logging ---
// if (process.env.NODE_ENV !== 'test') {
//   app.use(
//     morgan('combined', {
//       stream: { write: (message) => logger.http ? logger.http(message.trim()) : logger.info(message.trim()) },
//     })
//   );
// }

// // --- Health check (used by load balancers / uptime monitors) ---
// app.get('/health', (req, res) => {
//   res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
// });

// // --- API routes ---
// app.use('/api/v1', apiRoutes);

// // --- 404 handler for unmatched routes ---
// app.all('*', (req, res, next) => {
//   next(new AppError(req.t('general.notFound', { url: req.originalUrl }), 404));
// });

// // --- Global error handler (must be last) ---
// app.use(globalErrorHandler);

// module.exports = app;
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const apiRoutes = require('./routes');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./middlewares/errorHandler');
const detectLocale = require('./middlewares/detectLocale');
const { translate } = require('./utils/i18n');
const logger = require('./utils/logger');

const app = express();

// --- Security middlewares ---
app.use(helmet());
app.use(cors());

// --- Body parsing & compression ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// --- Locale detection ---
app.use(detectLocale);

// --- Rate limiting ---
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: (req) => ({
    success: false,
    message: translate(req.locale, 'general.tooManyRequests'),
  }),
});
app.use('/api', limiter);

// --- Auth limiter ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: (req) => ({
    success: false,
    message: translate(req.locale, 'general.tooManyAuthAttempts'),
  }),
});

app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// --- Logging ---
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: {
        write: (msg) =>
          logger.http ? logger.http(msg.trim()) : logger.info(msg.trim()),
      },
    })
  );
}

// --- Root route (FIX IMPORTANT) ---
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Law Firm API is running 🚀',
  });
});

// --- Health check ---
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// --- API routes ---
app.use('/api/v1', apiRoutes);

// --- 404 handler ---
app.all('*', (req, res, next) => {
  next(
    new AppError(
      (req.t && req.t('general.notFound', { url: req.originalUrl })) ||
        `Cannot find ${req.originalUrl} on this server`,
      404
    )
  );
});

// --- Global error handler ---
app.use(globalErrorHandler);

module.exports = app;
