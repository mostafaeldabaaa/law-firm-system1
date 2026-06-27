const Document = require('../models/Document');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/sendResponse');
const {
  deleteAllVersions,
  deleteStoredFile,
  buildVersionFromUploadedFile,
} = require('../services/documentStorageService');

const createDocument = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError(req.t('document.fileRequired'), 400));
  }

  const { title, case: caseId, category } = req.body;

  const document = await Document.create({
    title,
    case: caseId || null,
    category,
    uploadedBy: req.user._id,
    currentVersion: 1,
    versions: [
      {
        versionNumber: 1,
        ...buildVersionFromUploadedFile(req.file),
        uploadedBy: req.user._id,
        note: 'Initial upload',
      },
    ],
  });

  sendResponse(res, 201, { message: req.t('document.uploadSuccess'), data: { document } });
});

/**
 * POST /api/v1/documents/:id/versions
 * Adds a new version without deleting the previous one — full
 * version history (including the older Cloudinary URLs/local paths)
 * is preserved for legal/audit purposes, matching the Document
 * Versioning feature from the original spec.
 */
const addDocumentVersion = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError(req.t('document.versionFileRequired'), 400));
  }

  const document = await Document.findById(req.params.id);
  if (!document) return next(new AppError(req.t('document.notFound'), 404));

  const nextVersion = document.currentVersion + 1;

  document.versions.push({
    versionNumber: nextVersion,
    ...buildVersionFromUploadedFile(req.file),
    uploadedBy: req.user._id,
    note: req.body.note || '',
  });
  document.currentVersion = nextVersion;

  await document.save();

  sendResponse(res, 201, {
    message: req.t('document.versionAddSuccess', { version: nextVersion }),
    data: { document },
  });
});

const getAllDocuments = catchAsync(async (req, res) => {
  const { case: caseId, category, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (caseId) filter.case = caseId;
  if (category) filter.category = category;

  const skip = (Number(page) - 1) * Number(limit);

  const [documents, total] = await Promise.all([
    // versions.filePath is now a public Cloudinary CDN URL (or, in the
    // local-disk fallback, a server-relative path) rather than a
    // sensitive internal filesystem path, so it's safe to include in
    // the list view — unlike the previous disk-only implementation.
    Document.find(filter)
      .select('-versions.storageProviderId')
      .populate('uploadedBy', 'firstName lastName')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Document.countDocuments(filter),
  ]);

  sendResponse(res, 200, {
    data: { documents },
    meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
  });
});

const getDocument = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id)
    .select('-versions.storageProviderId')
    .populate('uploadedBy', 'firstName lastName');
  if (!document) return next(new AppError(req.t('document.notFound'), 404));
  sendResponse(res, 200, { data: { document } });
});

/**
 * DELETE /api/v1/documents/:id
 * Removes the MongoDB record AND every stored file behind every
 * version (Cloudinary assets or local files) — otherwise deleted
 * documents would keep silently consuming the (limited) storage quota.
 */
const deleteDocument = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id);
  if (!document) return next(new AppError(req.t('document.notFound'), 404));

  await deleteAllVersions(document);
  await document.deleteOne();

  sendResponse(res, 204, { message: req.t('document.deleteSuccess') });
});

/**
 * DELETE /api/v1/documents/:id/versions/:versionNumber
 * Removes a single old version (and its underlying file) while
 * keeping the rest of the document's history intact. Deleting the
 * current version is blocked — callers should upload a new version
 * or delete the whole document instead.
 */
const deleteDocumentVersion = catchAsync(async (req, res, next) => {
  const document = await Document.findById(req.params.id);
  if (!document) return next(new AppError(req.t('document.notFound'), 404));

  const versionNumber = Number(req.params.versionNumber);
  if (versionNumber === document.currentVersion) {
    return next(new AppError(req.t('document.cannotDeleteCurrentVersion'), 400));
  }

  const versionToRemove = document.versions.find((v) => v.versionNumber === versionNumber);
  if (!versionToRemove) return next(new AppError(req.t('document.versionNotFound'), 404));

  await deleteStoredFile(versionToRemove);
  document.versions = document.versions.filter((v) => v.versionNumber !== versionNumber);
  await document.save();

  sendResponse(res, 200, { message: req.t('document.versionDeleteSuccess'), data: { document } });
});

module.exports = {
  createDocument,
  addDocumentVersion,
  getAllDocuments,
  getDocument,
  deleteDocument,
  deleteDocumentVersion,
};
