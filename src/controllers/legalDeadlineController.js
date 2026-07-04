// const { LegalDeadline } = require('../models/LegalDeadline');
// const AppError = require('../utils/AppError');
// const catchAsync = require('../utils/catchAsync');
// const sendResponse = require('../utils/sendResponse');
// const { createNotification } = require('../services/notificationService');

// const createDeadline = catchAsync(async (req, res) => {
//   const deadline = await LegalDeadline.create(req.body);

//   await createNotification({
//     recipientId: deadline.responsibleLawyer,
//     title: 'New legal deadline assigned',
//     message: `A new deadline "${deadline.title}" was set for ${deadline.dueDate.toLocaleDateString()}.`,
//     relatedResource: { resourceType: 'LegalDeadline', resourceId: deadline._id },
//   });

//   sendResponse(res, 201, { message: req.t('deadline.createSuccess'), data: { deadline } });
// });

// const getAllDeadlines = catchAsync(async (req, res) => {
//   const { case: caseId, status, type, responsibleLawyer, page = 1, limit = 20 } = req.query;

//   const filter = {};
//   if (caseId) filter.case = caseId;
//   if (status) filter.status = status;
//   if (type) filter.type = type;
//   if (responsibleLawyer) filter.responsibleLawyer = responsibleLawyer;

//   if (req.user.role === 'lawyer') {
//     filter.responsibleLawyer = req.user._id;
//   }

//   const skip = (Number(page) - 1) * Number(limit);

//   const [deadlines, total] = await Promise.all([
//     LegalDeadline.find(filter)
//       .populate('case', 'caseNumber title')
//       .populate('responsibleLawyer')
//       .sort({ dueDate: 1 })
//       .skip(skip)
//       .limit(Number(limit)),
//     LegalDeadline.countDocuments(filter),
//   ]);

//   sendResponse(res, 200, {
//     data: { deadlines },
//     meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
//   });
// });

// const getDeadline = catchAsync(async (req, res, next) => {
//   const deadline = await LegalDeadline.findById(req.params.id)
//     .populate('case')
//     .populate('responsibleLawyer');
//   if (!deadline) return next(new AppError(req.t('deadline.notFound'), 404));
//   sendResponse(res, 200, { data: { deadline } });
// });

// const updateDeadlineStatus = catchAsync(async (req, res, next) => {
//   const { status, completionNote } = req.body;

//   const update = { status };
//   if (status === 'completed') {
//     update.completedAt = new Date();
//     update.completionNote = completionNote || '';
//   }

//   const deadline = await LegalDeadline.findByIdAndUpdate(req.params.id, update, {
//     new: true,
//     runValidators: true,
//   });
//   if (!deadline) return next(new AppError(req.t('deadline.notFound'), 404));

//   sendResponse(res, 200, { message: req.t('deadline.statusUpdateSuccess'), data: { deadline } });
// });

// const deleteDeadline = catchAsync(async (req, res, next) => {
//   const deadline = await LegalDeadline.findByIdAndDelete(req.params.id);
//   if (!deadline) return next(new AppError(req.t('deadline.notFound'), 404));
//   sendResponse(res, 204, { message: req.t('deadline.deleteSuccess') });
// });

// module.exports = { createDeadline, getAllDeadlines, getDeadline, updateDeadlineStatus, deleteDeadline };
const { LegalDeadline } = require('../models/LegalDeadline');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { createNotification } = require('../services/notificationService');

// Nested populate: responsibleLawyer (Lawyer doc) -> user (firstName/lastName etc.)
const LAWYER_POPULATE = { path: 'responsibleLawyer', populate: { path: 'user', select: 'firstName lastName email' } };

const createDeadline = catchAsync(async (req, res) => {
  const deadline = await LegalDeadline.create(req.body);

  await createNotification({
    recipientId: deadline.responsibleLawyer,
    title: 'New legal deadline assigned',
    message: `A new deadline "${deadline.title}" was set for ${deadline.dueDate.toLocaleDateString()}.`,
    relatedResource: { resourceType: 'LegalDeadline', resourceId: deadline._id },
  });

  sendResponse(res, 201, { message: req.t('deadline.createSuccess'), data: { deadline } });
});

const getAllDeadlines = catchAsync(async (req, res) => {
  const { case: caseId, status, type, responsibleLawyer, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (caseId) filter.case = caseId;
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (responsibleLawyer) filter.responsibleLawyer = responsibleLawyer;

  if (req.user.role === 'lawyer') {
    filter.responsibleLawyer = req.user._id;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [deadlines, total] = await Promise.all([
    LegalDeadline.find(filter)
      .populate('case', 'caseNumber title')
      .populate(LAWYER_POPULATE)
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(Number(limit)),
    LegalDeadline.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: { deadlines },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
  });
});

const getDeadline = catchAsync(async (req, res, next) => {
  const deadline = await LegalDeadline.findById(req.params.id)
    .populate('case')
    .populate(LAWYER_POPULATE);
  if (!deadline) return next(new AppError(req.t('deadline.notFound'), 404));
  sendResponse(res, 200, { data: { deadline } });
});

// Full update of a deadline's editable fields (title, case, type, dueDate, responsibleLawyer, description).
// Status changes should still go through updateDeadlineStatus so the completedAt/completionNote
// side-effects stay consistent.
const updateDeadline = catchAsync(async (req, res, next) => {
  const { status, completedAt, completionNote, ...editableFields } = req.body;

  const deadline = await LegalDeadline.findByIdAndUpdate(req.params.id, editableFields, {
    new: true,
    runValidators: true,
  })
    .populate('case', 'caseNumber title')
    .populate(LAWYER_POPULATE);

  if (!deadline) return next(new AppError(req.t('deadline.notFound'), 404));

  sendResponse(res, 200, { message: req.t('deadline.updateSuccess'), data: { deadline } });
});

const updateDeadlineStatus = catchAsync(async (req, res, next) => {
  const { status, completionNote } = req.body;

  const update = { status };
  if (status === 'completed') {
    update.completedAt = new Date();
    update.completionNote = completionNote || '';
  }

  const deadline = await LegalDeadline.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  if (!deadline) return next(new AppError(req.t('deadline.notFound'), 404));

  sendResponse(res, 200, { message: req.t('deadline.statusUpdateSuccess'), data: { deadline } });
});

const deleteDeadline = catchAsync(async (req, res, next) => {
  const deadline = await LegalDeadline.findByIdAndDelete(req.params.id);
  if (!deadline) return next(new AppError(req.t('deadline.notFound'), 404));
  sendResponse(res, 204, { message: req.t('deadline.deleteSuccess') });
});

module.exports = {
  createDeadline,
  getAllDeadlines,
  getDeadline,
  updateDeadline,
  updateDeadlineStatus,
  deleteDeadline,
};