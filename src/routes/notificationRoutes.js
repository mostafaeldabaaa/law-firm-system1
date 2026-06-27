const express = require('express');
const notificationController = require('../controllers/notificationController');
const protect = require('../middlewares/protect');

const router = express.Router();

router.use(protect);

router.get('/', notificationController.getMyNotifications);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markNotificationRead);

module.exports = router;
