const { Case } = require('../models/Case');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { generateCaseNumber, transitionCaseStatus } = require('../services/caseService');
const { generateInitialTasksForCase } = require('../services/taskService');

const createCase = catchAsync(async (req, res) => {
  const caseNumber = await generateCaseNumber();

  const newCase = await Case.create({
    ...req.body,
    caseNumber,
  });

  newCase.timeline.push({
    type: 'CASE_CREATED',
    description: `Case "${newCase.title}" was created.`,
    performedBy: req.user._id,
  });
  await newCase.save();

  // Workflow automation: New Case Created -> Generate Initial Tasks -> Notify Team
  const tasks = await generateInitialTasksForCase(newCase, req.user._id);

  sendResponse(res, 201, {
    message: req.t('case.createSuccess'),
    data: { case: newCase, generatedTasks: tasks.length },
  });
});

const getAllCases = catchAsync(async (req, res) => {
  const { status, caseType, client, leadLawyer, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (caseType) filter.caseType = caseType;
  if (client) filter.client = client;
  if (leadLawyer) filter.leadLawyer = leadLawyer;

  if (req.user.role === 'lawyer') {
    filter.$or = [{ leadLawyer: req.user._id }, { assignedLawyers: req.user._id }];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [cases, total] = await Promise.all([
    Case.find(filter)
      .populate('client', 'fullName companyName')
      .populate('leadLawyer')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Case.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: { cases },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
  });
});

const getCase = catchAsync(async (req, res, next) => {
  const caseDoc = await Case.findById(req.params.id)
    .populate('client')
    .populate('leadLawyer')
    .populate('assignedLawyers')
    .populate('relatedCases', 'caseNumber title status')
    .populate('timeline.performedBy', 'firstName lastName role');

  if (!caseDoc) return next(new AppError(req.t('case.notFound'), 404));
  sendResponse(res, 200, { data: { case: caseDoc } });
});

const updateCase = catchAsync(async (req, res, next) => {
  const disallowedFields = ['status', 'caseNumber', 'timeline'];
  const updates = { ...req.body };
  disallowedFields.forEach((f) => delete updates[f]);

  const caseDoc = await Case.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!caseDoc) return next(new AppError(req.t('case.notFound'), 404));
  sendResponse(res, 200, { message: req.t('case.updateSuccess'), data: { case: caseDoc } });
});

const updateCaseStatus = catchAsync(async (req, res, next) => {
  const caseDoc = await Case.findById(req.params.id);
  if (!caseDoc) return next(new AppError(req.t('case.notFound'), 404));

  const updated = await transitionCaseStatus(caseDoc, req.body.status, req.user._id, req.body.note, req.t);

  sendResponse(res, 200, { message: req.t('case.statusUpdateSuccess'), data: { case: updated } });
});

const addCaseNote = catchAsync(async (req, res, next) => {
  const caseDoc = await Case.findById(req.params.id);
  if (!caseDoc) return next(new AppError(req.t('case.notFound'), 404));

  caseDoc.timeline.push({
    type: 'NOTE_ADDED',
    description: req.body.description,
    performedBy: req.user._id,
  });
  await caseDoc.save();

  sendResponse(res, 201, {
    message: req.t('case.noteAdded'),
    data: { timeline: caseDoc.timeline },
  });
});

const deleteCase = catchAsync(async (req, res, next) => {
  const caseDoc = await Case.findByIdAndDelete(req.params.id);
  if (!caseDoc) return next(new AppError(req.t('case.notFound'), 404));
  sendResponse(res, 204, { message: req.t('case.deleteSuccess') });
});

module.exports = {
  createCase,
  getAllCases,
  getCase,
  updateCase,
  updateCaseStatus,
  addCaseNote,
  deleteCase,
};
