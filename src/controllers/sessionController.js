const Session = require('../models/Session');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { assertNoConflict, rescheduleSession } = require('../services/sessionService');
const { createNotification } = require('../services/notificationService');

const createSession = catchAsync(async (req, res) => {
  const { case: caseId, lawyer, startTime, endTime, type, title, location, attendees, notes } = req.body;

  await assertNoConflict({ lawyerId: lawyer, startTime, endTime, t: req.t });

  const session = await Session.create({
    case: caseId,
    lawyer,
    startTime,
    endTime,
    type,
    title,
    location,
    attendees,
    notes,
  });

  await createNotification({
    recipientId: lawyer,
    title: 'New session scheduled',
    message: `A new session "${title}" was scheduled for you on ${new Date(startTime).toLocaleString()}.`,
    relatedResource: { resourceType: 'Session', resourceId: session._id },
  });

  sendResponse(res, 201, { message: req.t('session.scheduleSuccess'), data: { session } });
});
const getAllSessions = catchAsync(async (req, res) => {
  const { lawyer, case: caseId, status, from, to, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (lawyer) filter.lawyer = lawyer;
  if (caseId) filter.case = caseId;
  if (status) filter.status = status;
  if (from || to) {
    filter.startTime = {};
    if (from) filter.startTime.$gte = new Date(from);
    if (to) filter.startTime.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [sessions, total] = await Promise.all([
    Session.find(filter)
      .populate('case', 'caseNumber title')
      .populate({
        path: 'lawyer',
        populate: { path: 'user', select: 'firstName lastName name email' },
      }) // ✅ populate متداخل عشان بيانات المحامي تكمّل لحد اسمه
      .skip(skip)
      .limit(Number(limit))
      .sort({ startTime: 1 }),
    Session.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: { sessions },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
  });
});

// const getAllSessions = catchAsync(async (req, res) => {
//   const { lawyer, case: caseId, status, from, to, page = 1, limit = 20 } = req.query;

//   const filter = {};
//   if (lawyer) filter.lawyer = lawyer;
//   if (caseId) filter.case = caseId;
//   if (status) filter.status = status;
//   if (from || to) {
//     filter.startTime = {};
//     if (from) filter.startTime.$gte = new Date(from);
//     if (to) filter.startTime.$lte = new Date(to);
//   }

//   const skip = (Number(page) - 1) * Number(limit);

//   const [sessions, total] = await Promise.all([
//     Session.find(filter)
//       .populate('case', 'caseNumber title')
//       .populate('lawyer')
//       .skip(skip)
//       .limit(Number(limit))
//       .sort({ startTime: 1 }),
//     Session.countDocuments(filter),
//   ]);

//   sendResponse(res, 200, {
//     data: { sessions },
//     meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
//   });
// });

const getSession = catchAsync(async (req, res, next) => {
  const session = await Session.findById(req.params.id).populate('case').populate('lawyer');
  if (!session) return next(new AppError(req.t('session.notFound'), 404));
  sendResponse(res, 200, { data: { session } });
});

const reschedule = catchAsync(async (req, res, next) => {
  const session = await Session.findById(req.params.id);
  if (!session) return next(new AppError(req.t('session.notFound'), 404));
  if (session.status !== 'scheduled') {
    return next(new AppError(req.t('session.cannotReschedule', { status: session.status }), 400));
  }

  const newSession = await rescheduleSession(session, req.body, req.user._id, req.t);

  sendResponse(res, 200, {
    message: req.t('session.rescheduleSuccess'),
    data: { newSession, oldSessionId: session._id },
  });
});

const completeSession = catchAsync(async (req, res, next) => {
  const session = await Session.findById(req.params.id);
  if (!session) return next(new AppError(req.t('session.notFound'), 404));

  session.status = 'completed';
  if (Array.isArray(req.body.attendees)) {
    session.attendees = req.body.attendees;
  }
  if (req.body.notes) session.notes = req.body.notes;

  await session.save();
  sendResponse(res, 200, { message: req.t('session.completeSuccess'), data: { session } });
});

const cancelSession = catchAsync(async (req, res, next) => {
  const session = await Session.findByIdAndUpdate(
    req.params.id,
    { status: 'cancelled' },
    { new: true }
  );
  if (!session) return next(new AppError(req.t('session.notFound'), 404));
  sendResponse(res, 200, { message: req.t('session.cancelSuccess'), data: { session } });
});

module.exports = {
  createSession,
  getAllSessions,
  getSession,
  reschedule,
  completeSession,
  cancelSession,
};
