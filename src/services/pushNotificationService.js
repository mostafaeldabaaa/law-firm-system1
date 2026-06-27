const { getMessaging } = require('../config/firebase');
const { User } = require('../models/User');
const logger = require('../utils/logger');

/**
 * Push notification delivery via Firebase Cloud Messaging (FCM).
 *
 * This is intentionally the ONLY Firebase product used in this system —
 * no Firestore, no Cloud Functions, no Firebase Auth — which keeps the
 * integration inside FCM's permanently free tier regardless of volume.
 * Everything else (the database, the API, the business logic) stays on
 * the existing Node.js/Express/MongoDB stack; Firebase Admin SDK is
 * called directly from this service like any other outbound HTTP call.
 *
 * If Firebase isn't configured (see config/firebase.js), every function
 * here degrades to a harmless no-op + log line rather than throwing,
 * so push notifications are an enhancement, not a hard dependency.
 */

/**
 * Sends a push notification to every device token registered for a user.
 * Automatically prunes tokens that FCM reports as invalid/unregistered
 * (e.g. the user uninstalled the app or cleared browser data) so the
 * user's token list doesn't grow stale forever.
 */
const sendPushToUser = async (userId, { title, body, data = {} }) => {
  const messaging = getMessaging();
  if (!messaging) {
    logger.debug(`[push-disabled] Would have sent to user ${userId}: ${title}`);
    return { sent: 0, failed: 0 };
  }

  const user = await User.findById(userId).select('fcmTokens');
  if (!user || !user.fcmTokens.length) {
    return { sent: 0, failed: 0 };
  }

  const tokens = user.fcmTokens.map((t) => t.token);

  const message = {
    notification: { title, body },
    // FCM data payload values must all be strings.
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    tokens,
  };

  let response;
  try {
    response = await messaging.sendEachForMulticast(message);
  } catch (err) {
    logger.error(`FCM sendEachForMulticast failed for user ${userId}: ${err.message}`);
    return { sent: 0, failed: tokens.length };
  }

  // Collect tokens FCM says are no longer valid, and remove them.
  const invalidTokens = [];
  response.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code;
      if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
        invalidTokens.push(tokens[i]);
      } else {
        logger.warn(`FCM delivery failed for one token of user ${userId}: ${r.error?.message}`);
      }
    }
  });

  if (invalidTokens.length) {
    await User.findByIdAndUpdate(userId, {
      $pull: { fcmTokens: { token: { $in: invalidTokens } } },
    });
    logger.info(`Pruned ${invalidTokens.length} invalid FCM token(s) for user ${userId}.`);
  }

  return { sent: response.successCount, failed: response.failureCount };
};

/**
 * Registers (or refreshes) a device token for a user. Called from
 * POST /api/v1/users/me/fcm-token right after the client obtains a
 * token from the Firebase SDK in the browser/app.
 */
const registerToken = async (userId, token, device = 'unknown') => {
  await User.findByIdAndUpdate(userId, { $pull: { fcmTokens: { token } } });
  await User.findByIdAndUpdate(userId, {
    $push: { fcmTokens: { token, device, addedAt: new Date() } },
  });
};

/**
 * Removes a device token, e.g. on logout from that specific device,
 * so a signed-out device stops receiving pushes for this user.
 */
const removeToken = async (userId, token) => {
  await User.findByIdAndUpdate(userId, { $pull: { fcmTokens: { token } } });
};

module.exports = { sendPushToUser, registerToken, removeToken };
