/**
 * Arabic text normalization for search.
 *
 * MongoDB's text index has no official Arabic stemmer (unlike English,
 * French, Spanish, etc. — see https://www.mongodb.com/docs/manual/reference/text-search-languages/).
 * Without normalization, searching "محامي" would not match "المحامي" or
 * "محاميين", because:
 *   - Diacritics (tashkeel) make visually-identical words byte-different
 *   - Hamza variants (أ/إ/آ/ء) are treated as distinct characters
 *   - The definite article "ال" is kept as part of the word
 *   - Letter variants (ة/ه, ى/ي) are treated as distinct
 *
 * The fix: store a normalized copy of searchable text alongside the
 * original (which keeps its correct, fully-formed Arabic for display),
 * and run search queries through the same normalization before
 * matching against it. This is the standard workaround used since
 * MongoDB doesn't ship an Arabic-aware text search language.
 */

// Arabic diacritics (tashkeel) + tatweel (kashida) — purely visual, never
// meaningful for matching.
const DIACRITICS_REGEX = /[\u064B-\u065F\u0670\u0640]/g;

// Hamza / Alef variants → bare Alef
const ALEF_VARIANTS_REGEX = /[\u0622\u0623\u0625\u0671]/g; // آ أ إ ٱ

// Teh Marbuta → Heh (ة → ه), common spelling variation in casual input
const TEH_MARBUTA_REGEX = /\u0629/g;

// Alef Maksura → Yeh (ى → ي), common spelling variation
const ALEF_MAKSURA_REGEX = /\u0649/g;

// Leading definite article "ال" at the start of a word.
// Note: JS's \w only matches [A-Za-z0-9_], not Arabic letters, so we use
// an explicit Arabic letter range for the lookahead instead.
const ARABIC_LETTER = '\u0621-\u064A';
const DEFINITE_ARTICLE_REGEX = new RegExp(`(^|\\s)ال(?=[${ARABIC_LETTER}])`, 'g');

/**
 * Normalizes Arabic (and mixed Arabic/Latin) text for indexing/search.
 * Safe to run on non-Arabic text — it's a no-op for plain Latin strings.
 */
const normalizeArabic = (text = '') => {
  if (typeof text !== 'string' || !text) return '';

  return text
    .replace(DIACRITICS_REGEX, '')
    .replace(ALEF_VARIANTS_REGEX, '\u0627') // → ا
    .replace(TEH_MARBUTA_REGEX, '\u0647') // → ه
    .replace(ALEF_MAKSURA_REGEX, '\u064A') // → ي
    .replace(DEFINITE_ARTICLE_REGEX, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase(); // also normalizes any mixed-in Latin text
};

/**
 * Builds the combined searchable string for a document from one or
 * more source fields. Used both when saving a document (to populate
 * the indexed field) and when building a search query.
 */
const buildSearchableText = (...fields) => {
  return normalizeArabic(fields.filter(Boolean).join(' '));
};

module.exports = { normalizeArabic, buildSearchableText };
