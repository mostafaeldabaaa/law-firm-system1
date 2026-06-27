const Task = require('../models/Task');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { createNotification } = require('../services/notificationService');

const createTask = catchAsync(async (req, res) => {
  const task = await Task.create({ ...req.body, assignedBy: req.user._id });

  await createNotification({
    recipientId: task.assignedTo,
    title: 'New task assigned',
    message: `You have a new task: "${task.title}" due ${new Date(task.dueDate).toLocaleDateString()}.`,
    relatedResource: { resourceType: 'Task', resourceId: task._id },
  });

  sendResponse(res, 201, { message: req.t('task.createSuccess'), data: { task } });
});

const getAllTasks = catchAsync(async (req, res) => {
  const { status, priority, case: caseId, assignedTo, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (caseId) filter.case = caseId;
  if (assignedTo) filter.assignedTo = assignedTo;

  if (['lawyer', 'secretary'].includes(req.user.role)) {
    filter.assignedTo = req.user._id;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('assignedTo', 'firstName lastName')
      .populate('case', 'caseNumber title')
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(Number(limit)),
    Task.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: { tasks },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
  });
});

const getTask = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id)
    .populate('assignedTo', 'firstName lastName')
    .populate('case', 'caseNumber title')
    .populate('comments.author', 'firstName lastName');

  if (!task) return next(new AppError(req.t('task.notFound'), 404));
  sendResponse(res, 200, { data: { task } });
});

const updateTaskStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const update = { status };
  if (status === 'completed') update.completedAt = new Date();

  const task = await Task.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!task) return next(new AppError(req.t('task.notFound'), 404));

  sendResponse(res, 200, { message: req.t('task.statusUpdateSuccess'), data: { task } });
});

const addTaskComment = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  if (!task) return next(new AppError(req.t('task.notFound'), 404));

  task.comments.push({ author: req.user._id, text: req.body.text });
  await task.save();

  sendResponse(res, 201, { message: req.t('task.commentAdded'), data: { comments: task.comments } });
});

const deleteTask = catchAsync(async (req, res, next) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return next(new AppError(req.t('task.notFound'), 404));
  sendResponse(res, 204, { message: req.t('task.deleteSuccess') });
});

module.exports = { createTask, getAllTasks, getTask, updateTaskStatus, addTaskComment, deleteTask };
