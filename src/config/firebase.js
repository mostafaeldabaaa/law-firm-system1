const admin = require('firebase-admin');
const logger = require('../utils/logger');
/**
 * Firebase Admin SDK initialization, used for:
 *  1) Firebase Cloud Messaging (FCM) push notifications
 *  2) Firestore — a lightweight real-time mirror of consultation
 *     messages, used only so clients/lawyers see new messages instantly
 *     without polling. MongoDB remains the source of truth; Firestore
 *     writes are best-effort and never block the main request/response.
 *
 * Credentials are loaded from a service account JSON file downloaded
 * from Firebase Console (Project Settings -> Service Accounts ->
 * Generate new private key). The path is configured via
 * FIREBASE_SERVICE_ACCOUNT_PATH in .env — never commit this file.
 *
 * If Firebase isn't configured (e.g. local development without a
 * service account yet), initialization is skipped gracefully and
 * dependent services log instead of throwing, so the rest of the API
 * keeps working without FCM/Firestore.
 */
let initialized = false;
const initFirebase = () => {
  if (initialized) return admin;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    logger.warn(
      'FIREBASE_SERVICE_ACCOUNT_PATH is not set — push notifications via FCM and Firestore sync are disabled.'
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
    logger.info('Firebase Admin SDK initialized successfully (FCM push notifications + Firestore enabled).');
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

const getFirestore = () => {
  const app = initFirebase();
  return app ? app.firestore() : null;
};

module.exports = { initFirebase, getMessaging, getFirestore };