const cron = require('node-cron');
const { flagMissedDeadlines, sendUpcomingDeadlineReminders } = require('../services/legalDeadlineService');
const { sendUpcomingSessionReminders } = require('../services/sessionService');
const logger = require('../utils/logger');

/**
 * Proactive reminder job.
 *
 * Runs every 30 minutes (frequent enough to catch the "1 hour before a
 * session" threshold with reasonable precision) and handles three
 * related concerns in sequence:
 *
 *   1. Flag legal deadlines (appeals, cassation, etc.) that have
 *      passed without being marked completed — these are urgent,
 *      rights-affecting misses, distinct from a regular overdue task.
 *   2. Send "due soon" reminders for legal deadlines approaching one
 *      of their configured lead-time thresholds (e.g. 7/3/1 days out).
 *   3. Send reminders for sessions starting within the next 24 hours
 *      (fired again at the 1-hour mark).
 *
 * Each step is wrapped independently so a failure in one (e.g. a
 * malformed deadline document) doesn't prevent the others from running.
 */
const startDeadlineReminderJob = () => {
  cron.schedule('*/30 * * * *', async () => {
    try {
      const missedCount = await flagMissedDeadlines();
      if (missedCount > 0) {
        logger.warn(`Deadline reminder job: flagged ${missedCount} legal deadline(s) as MISSED.`);
      }
    } catch (err) {
      logger.error(`Deadline reminder job (flag missed) failed: ${err.message}`);
    }

    try {
      const deadlineReminders = await sendUpcomingDeadlineReminders();
      if (deadlineReminders > 0) {
        logger.info(`Deadline reminder job: sent ${deadlineReminders} upcoming-deadline reminder(s).`);
      }
    } catch (err) {
      logger.error(`Deadline reminder job (upcoming) failed: ${err.message}`);
    }

    try {
      const sessionReminders = await sendUpcomingSessionReminders([24, 1]);
      if (sessionReminders > 0) {
        logger.info(`Deadline reminder job: sent ${sessionReminders} upcoming-session reminder(s).`);
      }
    } catch (err) {
      logger.error(`Deadline reminder job (sessions) failed: ${err.message}`);
    }
  });

  logger.info('Legal deadline & session reminder cron job scheduled (runs every 30 minutes).');
};

module.exports = startDeadlineReminderJob;
