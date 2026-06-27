const { Case } = require('../models/Case');
const Document = require('../models/Document');
const { normalizeArabic } = require('../utils/arabicNormalize');

/**
 * Global Search.
 *
 * The original spec calls for Elasticsearch-backed search across cases,
 * PDFs, judgments, and memos with sub-100ms response times. This
 * implementation uses MongoDB's native text indexes (declared on Case
 * and Document schemas, with `default_language: 'none'`) to deliver the
 * same *feature* — unified, ranked, cross-collection search — without
 * requiring a separate Elasticsearch cluster.
 *
 * Arabic handling: MongoDB has no dedicated Arabic-aware stemmer that
 * plays well with mixed Arabic/Latin/numeric content (case numbers,
 * English case types, etc.), so both the indexed field
 * (`searchableText`, built in each model's pre-save hook) and the
 * incoming search keyword are run through the same normalization
 * (utils/arabicNormalize.js) before MongoDB ever sees them. This makes
 * "المحامي", "محامي", and "محامٍ" all match the same indexed term.
 *
 * See README "Scaling Beyond This Implementation" for the migration
 * path to a dedicated search engine (e.g. Elasticsearch with a proper
 * Arabic analyzer) at higher scale.
 */
const globalSearch = async (keyword, { limit = 10 } = {}) => {
  const normalizedKeyword = normalizeArabic(keyword);

  const [cases, documents] = await Promise.all([
    Case.find(
      { $text: { $search: normalizedKeyword, $language: 'none' } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .select('caseNumber title caseType status')
      .lean(),

    Document.find(
      { $text: { $search: normalizedKeyword, $language: 'none' } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .select('title category case currentVersion')
      .lean(),
  ]);

  return {
    cases: cases.map((c) => ({ ...c, _resultType: 'case' })),
    documents: documents.map((d) => ({ ...d, _resultType: 'document' })),
    totalResults: cases.length + documents.length,
  };
};

module.exports = { globalSearch };
