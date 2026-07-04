// const mongoose = require('mongoose');
// const logger = require('../utils/logger');

// /**
//  * Establishes connection to MongoDB.
//  * Retries are handled by mongoose's internal reconnection logic.
//  */
// const connectDB = async () => {
//   try {
//     const conn = await mongoose.connect(process.env.MONGO_URI, {
//       // Modern mongoose (6+/7+/8+) no longer needs useNewUrlParser/useUnifiedTopology
//       autoIndex: process.env.NODE_ENV !== 'production', // disable in prod for performance
//       serverSelectionTimeoutMS: 10000,
//     });

//     logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

//     mongoose.connection.on('disconnected', () => {
//       logger.warn('MongoDB disconnected');
//     });

//     mongoose.connection.on('error', (err) => {
//       logger.error(`MongoDB connection error: ${err.message}`);
//     });
//   } catch (error) {
//     logger.error(`MongoDB initial connection failed: ${error.message}`);
//     process.exit(1);
//   }
// };

// modconst mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: process.env.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 10000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;

  } catch (error) {
    logger.error(`MongoDB initial connection failed: ${error.message}`);

    // ❌ ممنوع تقفل السيرفر في Vercel
    // process.exit(1);

    // ✅ بدلها:
    throw new Error('Database connection failed');
  }
};

module.exports = connectDB;ule.exports = connectDB;
