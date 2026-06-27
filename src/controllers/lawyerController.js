const Lawyer = require('../models/Lawyer');
const { User } = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');

const createLawyer = catchAsync(async (req, res, next) => {
  const { user: userId, barNumber, specialties, yearsOfExperience, hourlyRate, bio } = req.body;

  const userDoc = await User.findById(userId);
  if (!userDoc) return next(new AppError(req.t('lawyer.userNotFound'), 404));
  if (!['lawyer', 'senior_lawyer', 'branch_manager'].includes(userDoc.role)) {
    return next(new AppError(req.t('lawyer.invalidRoleForLawyer'), 400));
  }

  const existingProfile = await Lawyer.findOne({ user: userId });
  if (existingProfile) return next(new AppError(req.t('lawyer.profileExists'), 409));

  const lawyer = await Lawyer.create({ user: userId, barNumber, specialties, yearsOfExperience, hourlyRate, bio });

  sendResponse(res, 201, { message: req.t('lawyer.createSuccess'), data: { lawyer } });
});

const getAllLawyers = catchAsync(async (req, res) => {
  const { specialty, isAvailable, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (specialty) filter.specialties = specialty;
  if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';

  const skip = (Number(page) - 1) * Number(limit);

  const [lawyers, total] = await Promise.all([
    Lawyer.find(filter)
      .populate('user', 'firstName lastName email phone role')
      .sort({ 'performance.casesClosed': -1 })
      .skip(skip)
      .limit(Number(limit)),
    Lawyer.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: { lawyers },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
  });
});

const getLawyer = catchAsync(async (req, res, next) => {
  const lawyer = await Lawyer.findById(req.params.id).populate('user', 'firstName lastName email phone role');
  if (!lawyer) return next(new AppError(req.t('lawyer.notFound'), 404));
  sendResponse(res, 200, { data: { lawyer } });
});

const updateLawyer = catchAsync(async (req, res, next) => {
  const allowedFields = ['specialties', 'yearsOfExperience', 'hourlyRate', 'bio', 'isAvailable'];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const lawyer = await Lawyer.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!lawyer) return next(new AppError(req.t('lawyer.notFound'), 404));
  sendResponse(res, 200, { message: req.t('lawyer.updateSuccess'), data: { lawyer } });
});

const deleteLawyer = catchAsync(async (req, res, next) => {
  const lawyer = await Lawyer.findByIdAndDelete(req.params.id);
  if (!lawyer) return next(new AppError(req.t('lawyer.notFound'), 404));
  sendResponse(res, 204, { message: req.t('lawyer.deleteSuccess') });
});

const getLawyerPerformance = catchAsync(async (req, res, next) => {
  const lawyer = await Lawyer.findById(req.params.id).populate('user', 'firstName lastName');
  if (!lawyer) return next(new AppError(req.t('lawyer.notFound'), 404));

  sendResponse(res, 200, {
    data: {
      lawyer: { id: lawyer._id, name: `${lawyer.user.firstName} ${lawyer.user.lastName}` },
      kpis: {
        winRate: lawyer.winRate,
        casesClosed: lawyer.performance.casesClosed,
        activeCases: lawyer.performance.activeCases,
        averageResolutionDays: lawyer.performance.averageResolutionDays,
        attendanceRate: lawyer.performance.attendanceRate,
        revenueGenerated: lawyer.performance.revenueGenerated,
      },
      lastCalculatedAt: lawyer.performance.lastCalculatedAt,
    },
  });
});

module.exports = {
  createLawyer,
  getAllLawyers,
  getLawyer,
  updateLawyer,
  deleteLawyer,
  getLawyerPerformance,
};
