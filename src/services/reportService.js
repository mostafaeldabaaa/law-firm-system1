const { Case } = require('../models/Case');
const Lawyer = require('../models/Lawyer');
const Session = require('../models/Session');

/**
 * Reporting Engine.
 * Aggregation-based reports computed on demand. For a real production
 * system at scale, these would be pre-computed by a scheduled job and
 * cached (Redis), since aggregations over large collections are
 * expensive to run on every request — noted here and in the README.
 */

const caseStatusReport = async () => {
  return Case.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$estimatedValue' } } },
    { $sort: { count: -1 } },
  ]);
};

const lawyerPerformanceReport = async () => {
  return Lawyer.find()
    .populate('user', 'firstName lastName')
    .select('user performance')
    .sort({ 'performance.casesClosed': -1 });
};

const revenueReport = async ({ from, to } = {}) => {
  const match = { status: 'closed' };
  if (from || to) {
    match.closedAt = {};
    if (from) match.closedAt.$gte = new Date(from);
    if (to) match.closedAt.$lte = new Date(to);
  }

  const result = await Case.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$closedAt' } },
        totalRevenue: { $sum: '$estimatedValue' },
        casesClosed: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return result;
};

const sessionReport = async ({ from, to } = {}) => {
  const match = {};
  if (from || to) {
    match.startTime = {};
    if (from) match.startTime.$gte = new Date(from);
    if (to) match.startTime.$lte = new Date(to);
  }

  return Session.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
};

const workloadAnalysisReport = async () => {
  return Case.aggregate([
    { $match: { status: { $ne: 'closed' } } },
    { $group: { _id: '$leadLawyer', activeCases: { $sum: 1 } } },
    {
      $lookup: {
        from: 'lawyers',
        localField: '_id',
        foreignField: '_id',
        as: 'lawyer',
      },
    },
    { $unwind: '$lawyer' },
    {
      $lookup: {
        from: 'users',
        localField: 'lawyer.user',
        foreignField: '_id',
        as: 'lawyerUser',
      },
    },
    { $unwind: '$lawyerUser' },
    {
      $project: {
        lawyerName: { $concat: ['$lawyerUser.firstName', ' ', '$lawyerUser.lastName'] },
        activeCases: 1,
      },
    },
    { $sort: { activeCases: -1 } },
  ]);
};

module.exports = {
  caseStatusReport,
  lawyerPerformanceReport,
  revenueReport,
  sessionReport,
  workloadAnalysisReport,
};
