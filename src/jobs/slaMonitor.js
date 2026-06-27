const cron = require('node-cron');
const { flagOverdueTasks } = require('../services/taskService');
const logger = require('../utils/logger');

/**
 * SLA Monitoring job.
 * Runs every hour to flag tasks that have passed their due date,
 * mirroring the "SLA Monitoring / Escalation Rules" feature from
 * the spec. Registered once from server.js.
 */
const startSlaMonitorJob = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await flagOverdueTasks();
      if (result.modifiedCount > 0) {
        logger.info(`SLA monitor: flagged ${result.modifiedCount} task(s) as overdue.`);
      }
    } catch (err) {
      logger.error(`SLA monitor job failed: ${err.message}`);
    }
  });

  logger.info('SLA monitoring cron job scheduled (runs hourly).');
};

module.exports = startSlaMonitorJob;
