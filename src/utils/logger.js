// const winston = require('winston');
// const path = require('path');

// /**
//  * Centralized logger used across the entire application.
//  * - Writes errors to logs/error.log
//  * - Writes everything to logs/combined.log
//  * - Pretty-prints to console in development
//  */
// const logger = winston.createLogger({
//   level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
//   format: winston.format.combine(
//     winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
//     winston.format.errors({ stack: true }),
//     winston.format.json()
//   ),
//   defaultMeta: { service: 'law-firm-system' },
//   transports: [
//     new winston.transports.File({
//       filename: path.join(__dirname, '../../logs/error.log'),
//       level: 'error',
//     }),
//     new winston.transports.File({
//       filename: path.join(__dirname, '../../logs/combined.log'),
//     }),
//   ],
// });

// if (process.env.NODE_ENV !== 'production') {
//   logger.add(
//     new winston.transports.Console({
//       format: winston.format.combine(
//         winston.format.colorize(),
//         winston.format.simple()
//       ),
//     })
//   );
// }

// module.exports = logger;
const winston = require('winston');

const transports = [];

// في Vercel استخدم Console فقط
if (process.env.VERCEL) {
  transports.push(new winston.transports.Console());
} else {
  const path = require('path');

  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
    })
  );

  if (process.env.NODE_ENV !== 'production') {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      })
    );
  }
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'law-firm-system' },
  transports,
});

module.exports = logger;