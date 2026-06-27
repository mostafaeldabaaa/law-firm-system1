const en = require('../locales/en.json');
const ar = require('../locales/ar.json');

const SUPPORTED_LOCALES = ['en', 'ar'];
const DEFAULT_LOCALE = 'en';

const dictionaries = { en, ar };

/**
 * Resolves a dotted key path (e.g. "case.notFound") inside a locale's
 * dictionary object.
 */
const resolveKey = (dict, keyPath) => {
  return keyPath.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), dict);
};

/**
 * Replaces {{placeholder}} tokens in a translated string with values
 * from the params object. e.g. "{{role}}" -> params.role
 */
const interpolate = (template, params = {}) => {
  if (typeof template !== 'string') return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, token) =>
    params[token] !== undefined ? params[token] : match
  );
};

/**
 * Translates a key for the given locale, falling back to English
 * (and finally to the raw key) if a translation is missing — this
 * way a missing Arabic string never breaks the response, it just
 * silently falls back instead of crashing.
 */
const translate = (locale, keyPath, params = {}) => {
  const safeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;

  const value =
    resolveKey(dictionaries[safeLocale], keyPath) ??
    resolveKey(dictionaries[DEFAULT_LOCALE], keyPath) ??
    keyPath;

  return interpolate(value, params);
};

module.exports = { translate, SUPPORTED_LOCALES, DEFAULT_LOCALE };
