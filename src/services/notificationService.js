const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const { sendPushToUser } = require('./pushNotificationService');

/**
 * Creates an in-app notification AND, in the same call, fires a Firebase
 * Cloud Messaging push notification to every device the user has
 * registered — so the user is reached even if they aren't actively
 * looking at the dashboard (the in-app notification alone only shows
 * up next time they open the app/site).
 *
 * This is the single entry point used by every other service (cases,
 * sessions, tasks) so notification logic stays in one place. Email/SMS
 * channels remain no-ops/log statements for this implementation since
 * they require external provider credentials (Nodemailer/Twilio) —
 * push is the one channel that's fully wired end-to-end because FCM
 * requires no paid account.
 *
 * Push delivery failures never block the in-app notification or the
 * caller's request — they're logged and swallowed, since a missing
 * push is degraded service, not a failure of the underlying action
 * (e.g. a case being created should still succeed even if FCM is down).
 */
const createNotification = async ({
  recipientId,
  title,
  message,
  type = 'info',
  channel = 'in_app',
  relatedResource = null,
}) => {
  let notification = null;

  try {
    notification = await Notification.create({
      recipient: recipientId,
      title,
      message,
      type,
      channel,
      relatedResource,
    });
  } catch (err) {
    logger.error(`Failed to create in-app notification: ${err.message}`);
  }

  // Fire-and-forget: don't let push delivery delay or fail the caller.
  sendPushToUser(recipientId, {
    title,
    body: message,
    data: {
      notificationId: notification ? String(notification._id) : '',
      resourceType: relatedResource?.resourceType || '',
      resourceId: relatedResource?.resourceId ? String(relatedResource.resourceId) : '',
    },
  }).catch((err) => logger.error(`Push delivery error for user ${recipientId}: ${err.message}`));

  return notification;
};

const markAsRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
};

const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ recipient: userId, isRead: false });
};

module.exports = { createNotification, markAsRead, getUnreadCount };
