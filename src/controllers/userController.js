const { User, ROLES } = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const createUser = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password, role, phone, branch, nationalId, companyName } = req.body;

  if (role && !ROLES.includes(role)) {
    return next(new AppError(req.t('user.roleInvalid', { roles: ROLES.join(', ') }), 400));
  }

  const existing = await User.findOne({ email });
  if (existing) return next(new AppError(req.t('user.emailExists'), 409));

  const user = await User.create({ firstName, lastName, email, password, role, phone, branch, nationalId, companyName });

  sendResponse(res, 201, { message: req.t('user.createSuccess'), data: { user: user.toSafeObject() } });
});
const getAllUsers = catchAsync(async (req, res) => {
  const { role, isActive, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (role) {
    const roles = role.split(',').map((r) => r.trim());
    filter.role = roles.length > 1 ? { $in: roles } : roles[0];
  }
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const skip = (Number(page) - 1) * Number(limit);

  const [users, total] = await Promise.all([
    User.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: { users: users.map((u) => u.toSafeObject()) },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
  });
});
const getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError(req.t('user.notFound'), 404));
  sendResponse(res, 200, { data: { user: user.toSafeObject() } });
});

const updateUser = catchAsync(async (req, res, next) => {
  const allowedFields = ['firstName', 'lastName', 'phone', 'role', 'branch', 'isActive', 'nationalId', 'companyName'];
  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!user) return next(new AppError(req.t('user.notFound'), 404));

  sendResponse(res, 200, { message: req.t('user.updateSuccess'), data: { user: user.toSafeObject() } });
});

const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) return next(new AppError(req.t('user.notFound'), 404));
  sendResponse(res, 200, { message: req.t('user.deactivateSuccess'), data: { user: user.toSafeObject() } });
});

module.exports = { createUser, getAllUsers, getUser, updateUser, deleteUser };
