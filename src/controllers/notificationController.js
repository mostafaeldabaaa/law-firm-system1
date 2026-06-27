const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { markAsRead, getUnreadCount } = require('../services/notificationService');

const getMyNotifications = catchAsync(async (req, res) => {
  const { isRead, page = 1, limit = 20 } = req.query;

  const filter = { recipient: req.user._id };
  if (isRead !== undefined) filter.isRead = isRead === 'true';

  const skip = (Number(page) - 1) * Number(limit);

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Notification.countDocuments(filter),
    getUnreadCount(req.user._id),
  ]);

  sendResponse(res, 200, {
    data: { notifications },
    meta: { total, unreadCount, page: Number(page), limit: Number(limit) },
  });
});

const markNotificationRead = catchAsync(async (req, res, next) => {
  const notification = await markAsRead(req.params.id, req.user._id);
  if (!notification) return next(new AppError(req.t('notification.notFound'), 404));
  sendResponse(res, 200, { message: req.t('notification.markedRead'), data: { notification } });
});

const markAllRead = catchAsync(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  sendResponse(res, 200, { message: req.t('notification.allMarkedRead') });
});

module.exports = { getMyNotifications, markNotificationRead, markAllRead };
