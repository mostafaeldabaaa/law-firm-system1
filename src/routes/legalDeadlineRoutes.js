const express = require('express');
const legalDeadlineController = require('../controllers/legalDeadlineController');
const protect = require('../middlewares/protect');
const { authorize } = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const auditLog = require('../middlewares/auditLog');
const { RESOURCES, ACTIONS } = require('../config/permissions');
const {
  createDeadlineValidator,
  updateDeadlineStatusValidator,
} = require('../validators/legalDeadlineValidators');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(authorize(RESOURCES.DEADLINES, ACTIONS.VIEW), legalDeadlineController.getAllDeadlines)
  .post(
    authorize(RESOURCES.DEADLINES, ACTIONS.CREATE),
    createDeadlineValidator,
    validate,
    auditLog('DEADLINE_CREATED', RESOURCES.DEADLINES),
    legalDeadlineController.createDeadline
  );

router
  .route('/:id')
  .get(authorize(RESOURCES.DEADLINES, ACTIONS.VIEW), legalDeadlineController.getDeadline)
  .delete(
    authorize(RESOURCES.DEADLINES, ACTIONS.DELETE),
    auditLog('DEADLINE_DELETED', RESOURCES.DEADLINES),
    legalDeadlineController.deleteDeadline
  );

router.patch(
  '/:id/status',
  authorize(RESOURCES.DEADLINES, ACTIONS.EDIT),
  updateDeadlineStatusValidator,
  validate,
  auditLog('DEADLINE_STATUS_UPDATED', RESOURCES.DEADLINES),
  legalDeadlineController.updateDeadlineStatus
);

module.exports = router;
