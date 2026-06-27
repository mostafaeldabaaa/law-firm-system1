const Client = require('../models/Client');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');

const createClient = catchAsync(async (req, res) => {
  const client = await Client.create(req.body);
  sendResponse(res, 201, { message: req.t('client.createSuccess'), data: { client } });
});

const getAllClients = catchAsync(async (req, res) => {
  const { search, assignedLawyer, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (assignedLawyer) filter.assignedLawyer = assignedLawyer;
  if (search) filter.$text = { $search: search };

  // Client-portal users should only ever see their own record
  if (req.user.role === 'client') {
    filter.user = req.user._id;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [clients, total] = await Promise.all([
    Client.find(filter)
      .populate('assignedLawyer', 'barNumber')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Client.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: { clients },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
  });
});

const getClient = catchAsync(async (req, res, next) => {
  const client = await Client.findById(req.params.id).populate('assignedLawyer');
  if (!client) return next(new AppError(req.t('client.notFound'), 404));

  if (req.user.role === 'client' && String(client.user) !== String(req.user._id)) {
    return next(new AppError(req.t('client.noPermissionView'), 403));
  }

  sendResponse(res, 200, { data: { client } });
});

const updateClient = catchAsync(async (req, res, next) => {
  const client = await Client.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!client) return next(new AppError(req.t('client.notFound'), 404));
  sendResponse(res, 200, { message: req.t('client.updateSuccess'), data: { client } });
});

const deleteClient = catchAsync(async (req, res, next) => {
  const client = await Client.findByIdAndDelete(req.params.id);
  if (!client) return next(new AppError(req.t('client.notFound'), 404));
  sendResponse(res, 204, { message: req.t('client.deleteSuccess') });
});

module.exports = { createClient, getAllClients, getClient, updateClient, deleteClient };
