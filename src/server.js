

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
// Load environment variables before anything else touches process.env
require('dotenv').config();
console.log("FIREBASE PATH:", process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
const { initFirebase, getMessaging } = require('./config/firebase');
initFirebase();
const messaging = getMessaging();

console.log("Messaging:", messaging ? "READY ✅" : "NOT READY ❌");
const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const startSlaMonitorJob = require('./jobs/slaMonitor');
const startDeadlineReminderJob = require('./jobs/deadlineReminder');

// Catch programming errors that escape every try/catch (e.g. in callbacks)
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION 💥 Shutting down...', { message: err.message, stack: err.stack });
  process.exit(1);
});

console.log("MONGO_URI:", process.env.MONGO_URI);
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  startSlaMonitorJob();
  startDeadlineReminderJob();

  // Catch unhandled promise rejections (e.g. a DB call that nobody awaited)
  process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION 💥 Shutting down...', { message: err.message, stack: err.stack });
    server.close(() => process.exit(1));
  });

  // Graceful shutdown on termination signals (e.g. from Docker/Kubernetes)
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => logger.info('Process terminated.'));
  });
};

startServer();
