const express = require('express');

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const lawyerRoutes = require('./lawyerRoutes');
const clientRoutes = require('./clientRoutes');
const caseRoutes = require('./caseRoutes');
const sessionRoutes = require('./sessionRoutes');
const taskRoutes = require('./taskRoutes');
const documentRoutes = require('./documentRoutes');
const notificationRoutes = require('./notificationRoutes');
const reportRoutes = require('./reportRoutes');
const searchRoutes = require('./searchRoutes');
const auditLogRoutes = require('./auditLogRoutes');
const legalDeadlineRoutes = require('./legalDeadlineRoutes');
const consultationRoutes = require('./consultationRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/lawyers', lawyerRoutes);
router.use('/clients', clientRoutes);
router.use('/cases', caseRoutes);
router.use('/sessions', sessionRoutes);
router.use('/tasks', taskRoutes);
router.use('/documents', documentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/search', searchRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/deadlines', legalDeadlineRoutes);
router.use('/consultations', consultationRoutes);

module.exports = router;
