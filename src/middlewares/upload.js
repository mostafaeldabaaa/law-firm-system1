const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('../utils/AppError');
const { isCloudinaryEnabled } = require('../config/cloudinary');

/**
 * Multer configuration for incoming file uploads.
 *
 * Two backends, chosen automatically based on whether Cloudinary is
 * configured (see config/cloudinary.js):
 *
 *   - Cloudinary enabled: uses multer.memoryStorage(). The file is
 *     held only as an in-memory buffer (req.file.buffer) — it never
 *     touches this server's disk. The actual upload to Cloudinary's
 *     CDN happens in the uploadToCloudinary middleware below, which
 *     runs right after this one in the route chain.
 *   - Cloudinary disabled (fallback): uses multer.diskStorage() to
 *     write directly into the local ./uploads folder, exactly as this
 *     project worked before Cloudinary was introduced — so the
 *     document module keeps working out of the box without requiring
 *     a cloud account.
 *
 * A hand-rolled memoryStorage + upload_stream approach is used here
 * instead of the third-party `multer-storage-cloudinary` package,
 * which only declares a peer dependency on Cloudinary's old v1 SDK
 * and is no longer actively maintained — depending on it would force
 * pinning to an outdated Cloudinary client.
 */

const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  const message = req.t
    ? req.t('document.fileTypeNotAllowed', { type: file.mimetype })
    : `File type '${file.mimetype}' is not allowed.`;
  cb(new AppError(message, 415));
};

const maxSizeMb = Number(process.env.MAX_FILE_SIZE_MB || 10);

const buildLocalDiskStorage = () => {
  const uploadDir = path.join(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, safeName);
    },
  });
};

const storage = isCloudinaryEnabled() ? multer.memoryStorage() : buildLocalDiskStorage();

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMb * 1024 * 1024 },
});

module.exports = upload;
