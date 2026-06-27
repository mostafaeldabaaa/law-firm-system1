const admin = require('firebase-admin');
const logger = require('../utils/logger');

/**
 * Firebase Admin SDK initialization, used exclusively for Firebase Cloud
 * Messaging (FCM) push notifications — no other Firebase product
 * (Firestore, Auth, Storage) is used, so this stays free under FCM's
 * no-cost tier regardless of volume.
 *
 * Credentials are loaded from a service account JSON file downloaded
 * from Firebase Console (Project Settings -> Service Accounts ->
 * Generate new private key). The path is configured via
 * FIREBASE_SERVICE_ACCOUNT_PATH in .env — never commit this file.
 *
 * If Firebase isn't configured (e.g. local development without a
 * service account yet), initialization is skipped gracefully and
 * pushNotificationService logs instead of throwing, so the rest of
 * the API keeps working without FCM.
 */
let initialized = false;

const initFirebase = () => {
  if (initialized) return admin;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountPath) {
    logger.warn(
      'FIREBASE_SERVICE_ACCOUNT_PATH is not set — push notifications via FCM are disabled.'
    );
    return null;
  }

  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
    logger.info('Firebase Admin SDK initialized successfully (FCM push notifications enabled).');
    return admin;
  } catch (err) {
    logger.error(`Failed to initialize Firebase Admin SDK: ${err.message}`);
    return null;
  }
};

const getMessaging = () => {
  const app = initFirebase();
  return app ? app.messaging() : null;
};

module.exports = { initFirebase, getMessaging };
