const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const reportService = require('../services/reportService');

const getCaseStatusReport = catchAsync(async (req, res) => {
  const report = await reportService.caseStatusReport();
  sendResponse(res, 200, { data: { report } });
});

const getLawyerPerformanceReport = catchAsync(async (req, res) => {
  const report = await reportService.lawyerPerformanceReport();
  sendResponse(res, 200, { data: { report } });
});

const getRevenueReport = catchAsync(async (req, res) => {
  const { from, to } = req.query;
  const report = await reportService.revenueReport({ from, to });
  sendResponse(res, 200, { data: { report } });
});

const getSessionReport = catchAsync(async (req, res) => {
  const { from, to } = req.query;
  const report = await reportService.sessionReport({ from, to });
  sendResponse(res, 200, { data: { report } });
});

const getWorkloadReport = catchAsync(async (req, res) => {
  const report = await reportService.workloadAnalysisReport();
  sendResponse(res, 200, { data: { report } });
});

module.exports = {
  getCaseStatusReport,
  getLawyerPerformanceReport,
  getRevenueReport,
  getSessionReport,
  getWorkloadReport,
};
