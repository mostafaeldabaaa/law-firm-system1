const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { registerToken, removeToken } = require('../services/pushNotificationService');

/**
 * POST /api/v1/users/me/fcm-token
 * Called by the frontend right after it obtains a registration token
 * from the Firebase JS SDK (web) or native SDK (mobile), so the
 * backend knows where to deliver push notifications for this user.
 */
const addFcmToken = catchAsync(async (req, res) => {
  const { token, device } = req.body;
  await registerToken(req.user._id, token, device);
  sendResponse(res, 200, { message: req.t('fcm.tokenRegistered') });
});

/**
 * DELETE /api/v1/users/me/fcm-token
 * Called on logout (for this device) so a signed-out browser/app
 * stops receiving pushes meant for this user.
 */
const deleteFcmToken = catchAsync(async (req, res) => {
  const { token } = req.body;
  await removeToken(req.user._id, token);
  sendResponse(res, 200, { message: req.t('fcm.tokenRemoved') });
});

module.exports = { addFcmToken, deleteFcmToken };
