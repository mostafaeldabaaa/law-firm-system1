const express = require('express');
const reportController = require('../controllers/reportController');
const protect = require('../middlewares/protect');
const { authorize } = require('../middlewares/authorize');
const auditLog = require('../middlewares/auditLog');
const { RESOURCES, ACTIONS } = require('../config/permissions');

const router = express.Router();

router.use(protect);
router.use(authorize(RESOURCES.REPORTS, ACTIONS.VIEW));

router.get('/case-status', reportController.getCaseStatusReport);
router.get('/lawyer-performance', reportController.getLawyerPerformanceReport);
router.get('/revenue', auditLog('REPORT_REVENUE_VIEWED', RESOURCES.REPORTS), reportController.getRevenueReport);
router.get('/sessions', reportController.getSessionReport);
router.get('/workload', reportController.getWorkloadReport);

module.exports = router;
