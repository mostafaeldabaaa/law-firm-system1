const { initCloudinary, isCloudinaryEnabled } = require('../config/cloudinary');
const AppError = require('../utils/AppError');

/**
 * Streams the in-memory file buffer (produced by multer.memoryStorage()
 * in middlewares/upload.js) up to Cloudinary, then normalizes the
 * result onto req.file so downstream controllers can read
 * req.file.path / req.file.size / req.file.filename exactly the same
 * way regardless of which storage backend handled the request —
 * documentController.js never needs to know Cloudinary was involved.
 *
 * No-ops (calls next() immediately) when:
 *   - Cloudinary isn't configured (local-disk fallback already wrote
 *     the file to disk in the previous middleware, nothing more to do)
 *   - there's no req.file (e.g. an optional-file route)
 */
const uploadToCloudinary = (req, res, next) => {
  if (!isCloudinaryEnabled() || !req.file) {
    return next();
  }

  const cloudinary = initCloudinary();
  const isImage = req.file.mimetype.startsWith('image/');

  const uploadStream = cloudinary.uploader.upload_stream(
    {
      folder: 'law-firm-documents',
      resource_type: isImage ? 'image' : 'raw',
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    },
    (error, result) => {
      if (error) {
        return next(new AppError(`Cloudinary upload failed: ${error.message}`, 502));
      }

      // Normalize onto req.file so the rest of the app (documentController,
      // documentStorageService) reads the same shape as the local-disk path.
      req.file.path = result.secure_url;
      req.file.filename = result.public_id;
      req.file.size = result.bytes;

      next();
    }
  );

  uploadStream.end(req.file.buffer);
};

module.exports = uploadToCloudinary;
