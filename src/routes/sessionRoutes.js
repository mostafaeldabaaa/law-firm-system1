const express = require('express');
const sessionController = require('../controllers/sessionController');
const protect = require('../middlewares/protect');
const { authorize } = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const auditLog = require('../middlewares/auditLog');
const { RESOURCES, ACTIONS } = require('../config/permissions');
const { createSessionValidator, rescheduleSessionValidator } = require('../validators/sessionValidators');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(authorize(RESOURCES.SESSIONS, ACTIONS.VIEW), sessionController.getAllSessions)
  .post(
    authorize(RESOURCES.SESSIONS, ACTIONS.CREATE),
    createSessionValidator,
    validate,
    auditLog('SESSION_CREATED', RESOURCES.SESSIONS),
    sessionController.createSession
  );

router.get('/:id', authorize(RESOURCES.SESSIONS, ACTIONS.VIEW), sessionController.getSession);

router.post(
  '/:id/reschedule',
  authorize(RESOURCES.SESSIONS, ACTIONS.EDIT),
  rescheduleSessionValidator,
  validate,
  auditLog('SESSION_RESCHEDULED', RESOURCES.SESSIONS),
  sessionController.reschedule
);

router.patch(
  '/:id/complete',
  authorize(RESOURCES.SESSIONS, ACTIONS.EDIT),
  auditLog('SESSION_COMPLETED', RESOURCES.SESSIONS),
  sessionController.completeSession
);

router.patch(
  '/:id/cancel',
  authorize(RESOURCES.SESSIONS, ACTIONS.EDIT),
  auditLog('SESSION_CANCELLED', RESOURCES.SESSIONS),
  sessionController.cancelSession
);

module.exports = router;
