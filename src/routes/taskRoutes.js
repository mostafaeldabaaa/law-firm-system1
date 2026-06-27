const express = require('express');
const taskController = require('../controllers/taskController');
const protect = require('../middlewares/protect');
const { authorize } = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const auditLog = require('../middlewares/auditLog');
const { RESOURCES, ACTIONS } = require('../config/permissions');
const {
  createTaskValidator,
  updateTaskStatusValidator,
  addCommentValidator,
} = require('../validators/taskValidators');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(authorize(RESOURCES.TASKS, ACTIONS.VIEW), taskController.getAllTasks)
  .post(
    authorize(RESOURCES.TASKS, ACTIONS.CREATE),
    createTaskValidator,
    validate,
    auditLog('TASK_CREATED', RESOURCES.TASKS),
    taskController.createTask
  );

router
  .route('/:id')
  .get(authorize(RESOURCES.TASKS, ACTIONS.VIEW), taskController.getTask)
  .delete(
    authorize(RESOURCES.TASKS, ACTIONS.DELETE),
    auditLog('TASK_DELETED', RESOURCES.TASKS),
    taskController.deleteTask
  );

router.patch(
  '/:id/status',
  authorize(RESOURCES.TASKS, ACTIONS.EDIT),
  updateTaskStatusValidator,
  validate,
  auditLog('TASK_STATUS_UPDATED', RESOURCES.TASKS),
  taskController.updateTaskStatus
);

router.post(
  '/:id/comments',
  authorize(RESOURCES.TASKS, ACTIONS.EDIT),
  addCommentValidator,
  validate,
  taskController.addTaskComment
);

module.exports = router;
