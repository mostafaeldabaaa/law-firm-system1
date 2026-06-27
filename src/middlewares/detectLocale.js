const { translate, SUPPORTED_LOCALES, DEFAULT_LOCALE } = require('../utils/i18n');

/**
 * Resolves the request's language and attaches a `req.t(key, params)`
 * helper, so controllers/services can translate without importing
 * the i18n util directly everywhere.
 *
 * Resolution order (first match wins):
 *   1. ?lang=ar query param         (easiest for quick testing / links)
 *   2. Accept-Language header       (standard, what browsers send)
 *   3. DEFAULT_LOCALE ('en')
 *
 * Must run before any middleware/controller that needs req.locale or req.t.
 */
const detectLocale = (req, res, next) => {
  let locale = DEFAULT_LOCALE;

  const queryLang = (req.query.lang || '').toLowerCase();
  if (SUPPORTED_LOCALES.includes(queryLang)) {
    locale = queryLang;
  } else {
    const header = (req.headers['accept-language'] || '').toLowerCase();
    const matched = SUPPORTED_LOCALES.find((l) => header.includes(l));
    if (matched) locale = matched;
  }

  req.locale = locale;
  req.t = (key, params) => translate(locale, key, params);

  res.setHeader('Content-Language', locale);
  next();
};

module.exports = detectLocale;
