const { Consultation } = require('../models/Consultation');
const { Case } = require('../models/Case');
const Client = require('../models/Client');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { createNotification } = require('../services/notificationService');
const { generateCaseNumber } = require('../services/caseService');

/**
 * POST /api/v1/consultations
 * A client submits a request (or staff logs one on behalf of a
 * phone/walk-in client). If preferredLawyer is set, that lawyer is
 * notified directly; otherwise it lands in the general queue for
 * staff/lawyers to pick up.
 */
const createConsultation = catchAsync(async (req, res, next) => {
  const { client: clientId, subject, description, category, preferredLawyer } = req.body;

  const clientDoc = await Client.findById(clientId);
  if (!clientDoc) return next(new AppError(req.t('client.notFound'), 404));

  // A client-portal user may only request a consultation for themselves.
  if (req.user.role === 'client' && String(clientDoc.user) !== String(req.user._id)) {
    return next(new AppError(req.t('client.noPermissionView'), 403));
  }

  const consultation = await Consultation.create({
    client: clientId,
    requestedBy: req.user._id,
    subject,
    description,
    category,
    preferredLawyer: preferredLawyer || null,
    messages: [{ sender: req.user._id, senderRole: 'client', text: description }],
  });

  if (preferredLawyer) {
    await createNotification({
      recipientId: preferredLawyer,
      title: 'New consultation request',
      message: `A client requested a consultation: "${subject}".`,
      relatedResource: { resourceType: 'Consultation', resourceId: consultation._id },
    });
  }

  sendResponse(res, 201, { message: req.t('consultation.createSuccess'), data: { consultation } });
});

/**
 * GET /api/v1/consultations
 * Clients see only their own; lawyers see their assigned queue plus
 * the unassigned general queue; staff/admin see everything.
 */
const getAllConsultations = catchAsync(async (req, res) => {
  const { status, assignedLawyer, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (assignedLawyer) filter.assignedLawyer = assignedLawyer;

  if (req.user.role === 'client') {
    const clientDoc = await Client.findOne({ user: req.user._id }).select('_id');
    filter.client = clientDoc ? clientDoc._id : null;
  } else if (req.user.role === 'lawyer') {
    filter.$or = [{ assignedLawyer: req.user._id }, { assignedLawyer: null }];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [consultations, total] = await Promise.all([
    Consultation.find(filter)
      .populate('client', 'fullName companyName')
      .populate('assignedLawyer')
      .select('-messages')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Consultation.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: { consultations },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
  });
});

const getConsultation = catchAsync(async (req, res, next) => {
  const consultation = await Consultation.findById(req.params.id)
    .populate('client')
    .populate('assignedLawyer')
    .populate('preferredLawyer')
    .populate('messages.sender', 'firstName lastName role');

  if (!consultation) return next(new AppError(req.t('consultation.notFound'), 404));

  if (req.user.role === 'client') {
    const clientDoc = await Client.findOne({ user: req.user._id }).select('_id');
    if (!clientDoc || String(consultation.client._id) !== String(clientDoc._id)) {
      return next(new AppError(req.t('client.noPermissionView'), 403));
    }
  }

  sendResponse(res, 200, { data: { consultation } });
});

/**
 * POST /api/v1/consultations/:id/messages
 * Threaded back-and-forth between client and lawyer on a single
 * consultation. Either side can post; the model just tags who sent it.
 */
const addMessage = catchAsync(async (req, res, next) => {
  const consultation = await Consultation.findById(req.params.id);
  if (!consultation) return next(new AppError(req.t('consultation.notFound'), 404));

  const senderRole = req.user.role === 'client' ? 'client' : req.user.role === 'lawyer' || req.user.role === 'senior_lawyer' ? 'lawyer' : 'staff';

  consultation.messages.push({ sender: req.user._id, senderRole, text: req.body.text });

  if (senderRole !== 'client' && consultation.status === 'pending') {
    consultation.status = 'in_progress';
  } else if (senderRole === 'lawyer' && consultation.status === 'in_progress') {
    consultation.status = 'answered';
  }

  await consultation.save();

  // Notify the other side: client gets notified when a lawyer/staff
  // replies; the assigned lawyer gets notified when the client replies.
  if (senderRole === 'client' && consultation.assignedLawyer) {
    await createNotification({
      recipientId: consultation.assignedLawyer,
      title: 'New reply on consultation',
      message: `New client message on consultation "${consultation.subject}".`,
      relatedResource: { resourceType: 'Consultation', resourceId: consultation._id },
    });
  } else if (senderRole !== 'client') {
    const clientDoc = await Client.findById(consultation.client).select('user');
    if (clientDoc?.user) {
      await createNotification({
        recipientId: clientDoc.user,
        title: 'Response to your consultation',
        message: `You have a new response on "${consultation.subject}".`,
        relatedResource: { resourceType: 'Consultation', resourceId: consultation._id },
      });
    }
  }

  sendResponse(res, 201, {
    message: req.t('consultation.messageAdded'),
    data: { messages: consultation.messages, status: consultation.status },
  });
});

/**
 * PATCH /api/v1/consultations/:id/assign
 * Staff assigns (or reassigns) a lawyer to an unassigned/general-queue
 * consultation.
 */
const assignLawyer = catchAsync(async (req, res, next) => {
  const consultation = await Consultation.findByIdAndUpdate(
    req.params.id,
    { assignedLawyer: req.body.assignedLawyer, status: 'in_progress' },
    { new: true, runValidators: true }
  );
  if (!consultation) return next(new AppError(req.t('consultation.notFound'), 404));

  await createNotification({
    recipientId: req.body.assignedLawyer,
    title: 'Consultation assigned to you',
    message: `You were assigned the consultation: "${consultation.subject}".`,
    relatedResource: { resourceType: 'Consultation', resourceId: consultation._id },
  });

  sendResponse(res, 200, { message: req.t('consultation.assignSuccess'), data: { consultation } });
});

/**
 * PATCH /api/v1/consultations/:id/status
 */
const updateStatus = catchAsync(async (req, res, next) => {
  const update = { status: req.body.status };
  if (req.body.status === 'closed') update.closedAt = new Date();

  const consultation = await Consultation.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  if (!consultation) return next(new AppError(req.t('consultation.notFound'), 404));

  sendResponse(res, 200, { message: req.t('consultation.statusUpdateSuccess'), data: { consultation } });
});

/**
 * POST /api/v1/consultations/:id/convert-to-case
 * Escalates a consultation into a real Case once it's clear the
 * client needs actual representation, not just advice. Creates the
 * Case with the consultation's subject/description as a starting
 * point and links back via `convertedToCase`.
 */
const convertToCase = catchAsync(async (req, res, next) => {
  const consultation = await Consultation.findById(req.params.id);
  if (!consultation) return next(new AppError(req.t('consultation.notFound'), 404));

  if (consultation.status === 'converted_to_case') {
    return next(new AppError(req.t('consultation.alreadyConverted'), 400));
  }

  const leadLawyer = req.body.leadLawyer || consultation.assignedLawyer;
  if (!leadLawyer) {
    return next(new AppError(req.t('consultation.leadLawyerRequiredForConversion'), 400));
  }

  const caseNumber = await generateCaseNumber();
  const newCase = await Case.create({
    caseNumber,
    title: req.body.title || consultation.subject,
    description: consultation.description,
    caseType: req.body.caseType || consultation.category || 'Other',
    client: consultation.client,
    leadLawyer,
    assignedLawyers: [leadLawyer],
    timeline: [
      {
        type: 'CASE_CREATED',
        description: `Case created from consultation "${consultation.subject}".`,
        performedBy: req.user._id,
      },
    ],
  });

  consultation.status = 'converted_to_case';
  consultation.convertedToCase = newCase._id;
  await consultation.save();

  sendResponse(res, 201, {
    message: req.t('consultation.convertSuccess'),
    data: { case: newCase, consultation },
  });
});

module.exports = {
  createConsultation,
  getAllConsultations,
  getConsultation,
  addMessage,
  assignLawyer,
  updateStatus,
  convertToCase,
};
