const mongoose = require('mongoose');
const { buildSearchableText } = require('../utils/arabicNormalize');

/**
 * Case lifecycle, matching the workflow defined for the system:
 * Draft -> Under Review -> Active -> Court Session -> Judgment Issued -> Closed
 * Stored as an explicit enum (not a free string) so transitions can be
 * validated in the service layer rather than trusted blindly from the client.
 */
const CASE_STATUSES = [
  'draft',
  'under_review',
  'active',
  'court_session',
  'judgment_issued',
  'closed',
];

// Defines which status transitions are legal, enforced in caseService.js
const ALLOWED_TRANSITIONS = {
  draft: ['under_review'],
  under_review: ['active', 'draft'],
  active: ['court_session', 'closed'],
  court_session: ['judgment_issued', 'active'],
  judgment_issued: ['closed'],
  closed: [], // terminal state
};

const caseEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      // e.g. 'STATUS_CHANGE', 'NOTE_ADDED', 'DOCUMENT_UPLOADED', 'COURT_DECISION'
    },
    description: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const caseSchema = new mongoose.Schema(
  {
    caseNumber: {
      type: String,
      required: true,
      unique: true,
      // generated in caseService.js, e.g. CASE-2026-000123
    },
    title: {
      type: String,
      required: [true, 'Case title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    caseType: {
      type: String,
      // e.g. 'Commercial', 'Criminal', 'Family', 'Labor', 'Real Estate'
      required: true,
    },
    status: {
      type: String,
      enum: CASE_STATUSES,
      default: 'draft',
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    assignedLawyers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lawyer',
      },
    ],
    leadLawyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lawyer',
      required: true,
    },
    court: {
      type: String,
      trim: true,
    },
    opposingParty: {
      type: String,
      trim: true,
    },
    relatedCases: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
      },
    ],
    outcome: {
      result: {
        type: String,
        enum: ['won', 'lost', 'settled', 'dismissed', 'pending', null],
        default: null,
      },
      judgmentSummary: String,
      judgmentDate: Date,
    },
    estimatedValue: {
      type: Number,
      default: 0,
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    timeline: [caseEventSchema],
    // Normalized (diacritics/hamza/definite-article stripped, lowercased)
    // concatenation of the searchable fields. Populated automatically in
    // the pre-save hook below. The text index is built on THIS field
    // rather than the raw `title`/`description`, since MongoDB's text
    // search has no Arabic-aware stemmer — see utils/arabicNormalize.js
    // for why this workaround is necessary.
    searchableText: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

caseSchema.index({ status: 1 });
caseSchema.index({ client: 1 });
caseSchema.index({ leadLawyer: 1 });
caseSchema.index({ searchableText: 'text' }, { default_language: 'none' });

// Keep searchableText in sync whenever the indexed fields change.
caseSchema.pre('save', function buildSearchIndex(next) {
  if (this.isModified('title') || this.isModified('description') || this.isModified('caseType') || this.isNew) {
    this.searchableText = buildSearchableText(this.title, this.description, this.caseType, this.caseNumber);
  }
  next();
});

caseSchema.methods.canTransitionTo = function canTransitionTo(newStatus) {
  return ALLOWED_TRANSITIONS[this.status]?.includes(newStatus) ?? false;
};

const Case = mongoose.model('Case', caseSchema);

module.exports = { Case, CASE_STATUSES, ALLOWED_TRANSITIONS };
