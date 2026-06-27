const { body } = require('express-validator');

const createTaskValidator = [
  body('title').trim().notEmpty().withMessage('validation.taskTitleRequired'),
  body('assignedTo').isMongoId().withMessage('validation.assignedToRequired'),
  body('dueDate').isISO8601().withMessage('validation.dueDateRequired'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('validation.priorityInvalid'),
  body('case').optional().isMongoId().withMessage('validation.caseIdRequired'),
];

const updateTaskStatusValidator = [
  body('status')
    .isIn(['pending', 'in_progress', 'completed', 'overdue', 'cancelled'])
    .withMessage('validation.taskStatusInvalid'),
];

const addCommentValidator = [
  body('text').trim().notEmpty().withMessage('validation.commentTextRequired'),
];

module.exports = { createTaskValidator, updateTaskStatusValidator, addCommentValidator };
