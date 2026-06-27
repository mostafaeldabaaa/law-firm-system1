const mongoose = require('mongoose');
const { buildSearchableText } = require('../utils/arabicNormalize');

const documentVersionSchema = new mongoose.Schema(
  {
    versionNumber: { type: Number, required: true },
    // For Cloudinary-backed uploads, filePath holds the secure HTTPS
    // delivery URL. For local-disk uploads (fallback when Cloudinary
    // isn't configured), it holds a filesystem path, as before.
    filePath: { type: String, required: true },
    // Cloudinary's public_id for this asset — required to delete or
    // replace it via the Cloudinary API later. Null for local-disk
    // uploads, where deletion is just an fs.unlink on filePath instead.
    storageProviderId: { type: String, default: null },
    storageProvider: { type: String, enum: ['cloudinary', 'local'], default: 'local' },
    fileSize: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String,
  },
  { timestamps: true }
);

/**
 * Document Management.
 *
 * Storage backend is resolved automatically at upload time by
 * middlewares/upload.js: Cloudinary when CLOUDINARY_* env vars are
 * set, local disk otherwise. Each version records which backend it
 * was stored with (`storageProvider`) since a single document's
 * version history can in principle span a backend migration —
 * deletion/cleanup logic (see services/documentStorageService.js)
 * checks this field rather than assuming.
 */
const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    case: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      default: null,
    },
    category: {
      type: String,
      enum: ['contract', 'judgment', 'memo', 'evidence', 'correspondence', 'other'],
      default: 'other',
    },
    currentVersion: {
      type: Number,
      default: 1,
    },
    versions: [documentVersionSchema],
    // Plain-text extraction used for full-text search (see searchService.js).
    // In a production system this would be populated by an OCR/parsing
    // pipeline; kept as a simple field here to demonstrate the search flow.
    extractedText: {
      type: String,
      default: '',
    },
    // Normalized (diacritics/hamza/definite-article stripped, lowercased)
    // copy of title + extractedText, used for the Arabic-aware text index.
    // See utils/arabicNormalize.js for why this workaround is necessary.
    searchableText: {
      type: String,
      default: '',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isSigned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

documentSchema.index({ case: 1 });
documentSchema.index({ searchableText: 'text' }, { default_language: 'none' });

documentSchema.pre('save', function buildSearchIndex(next) {
  if (this.isModified('title') || this.isModified('extractedText') || this.isNew) {
    this.searchableText = buildSearchableText(this.title, this.extractedText);
  }
  next();
});

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
