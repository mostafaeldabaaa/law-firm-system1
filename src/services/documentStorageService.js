const fs = require('fs');
const { initCloudinary } = require('../config/cloudinary');
const logger = require('../utils/logger');

/**
 * Storage-agnostic file deletion.
 *
 * Document deletion (and version pruning) needs to clean up the
 * underlying file regardless of which backend stored it. Centralizing
 * this here means documentController.js never needs an if/else on
 * storage provider — it just calls deleteStoredFile(version) for each
 * version being removed.
 */
const deleteStoredFile = async (version) => {
  if (!version) return;

  if (version.storageProvider === 'cloudinary' && version.storageProviderId) {
    const cloudinaryInstance = initCloudinary();
    if (!cloudinaryInstance) {
      logger.warn(`Cannot delete Cloudinary asset ${version.storageProviderId}: Cloudinary is not configured.`);
      return;
    }

    try {
      // resource_type must match what the file was uploaded as
      // (image vs raw) — see middlewares/upload.js for how that's decided.
      const resourceType = version.filePath?.includes('/image/') ? 'image' : 'raw';
      await cloudinaryInstance.uploader.destroy(version.storageProviderId, { resource_type: resourceType });
    } catch (err) {
      logger.error(`Failed to delete Cloudinary asset ${version.storageProviderId}: ${err.message}`);
    }
    return;
  }

  // Local disk fallback
  if (version.filePath && fs.existsSync(version.filePath)) {
    try {
      fs.unlinkSync(version.filePath);
    } catch (err) {
      logger.error(`Failed to delete local file ${version.filePath}: ${err.message}`);
    }
  }
};

/**
 * Deletes every stored version of a document. Called when a Document
 * is permanently removed, so old Cloudinary assets / local files
 * don't linger and quietly eat into the (limited, free-tier) storage
 * quota forever.
 */
const deleteAllVersions = async (documentDoc) => {
  await Promise.all((documentDoc.versions || []).map(deleteStoredFile));
};

/**
 * Builds the version metadata to attach to a Document/its versions
 * array from a just-uploaded Multer file, regardless of which storage
 * backend handled it.
 */
const buildVersionFromUploadedFile = (file) => {
  const isCloudinary = Boolean(file.path && file.path.startsWith('http'));

  return {
    filePath: file.path,
    fileSize: file.size || file.bytes || 0,
    storageProvider: isCloudinary ? 'cloudinary' : 'local',
    // middlewares/uploadToCloudinary.js normalizes the Cloudinary
    // public_id onto `file.filename`; local diskStorage also sets
    // `file.filename` but to a local filename, which is harmless to
    // store since storageProvider is checked before ever using it for
    // an API call.
    storageProviderId: isCloudinary ? file.filename : null,
  };
};

module.exports = { deleteStoredFile, deleteAllVersions, buildVersionFromUploadedFile };
