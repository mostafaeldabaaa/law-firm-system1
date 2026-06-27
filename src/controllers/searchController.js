const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const { globalSearch } = require('../services/searchService');

/**
 * GET /api/v1/search?q=keyword
 */
const search = catchAsync(async (req, res, next) => {
  const { q, limit } = req.query;
  if (!q || q.trim().length < 2) {
    return next(new AppError(req.t('validation.queryTooShort'), 400));
  }

  const startedAt = Date.now();
  const results = await globalSearch(q.trim(), { limit: Number(limit) || 10 });
  const tookMs = Date.now() - startedAt;

  sendResponse(res, 200, {
    data: results,
    meta: { query: q, tookMs },
  });
});

module.exports = { search };
