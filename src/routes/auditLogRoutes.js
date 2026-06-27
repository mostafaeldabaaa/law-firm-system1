const express = require('express');
const auditLogController = require('../controllers/auditLogController');
const protect = require('../middlewares/protect');
const { authorize } = require('../middlewares/authorize');
const { RESOURCES, ACTIONS } = require('../config/permissions');

const router = express.Router();

router.use(protect);
router.get('/', authorize(RESOURCES.AUDIT_LOGS, ACTIONS.VIEW), auditLogController.getAuditLogs);

module.exports = router;
