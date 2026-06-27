const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

/**
 * Cloudinary configuration for document storage.
 *
 * Replaces local-disk storage (Multer's diskStorage) with a managed
 * cloud store: files are uploaded directly to Cloudinary and only the
 * resulting secure URL + public_id are persisted in MongoDB — the
 * Node.js process never holds the file on its own filesystem, which
 * also means uploads survive container restarts/redeploys.
 *
 * IMPORTANT — free tier caveat (see README "Document Storage" section):
 * Cloudinary's free tier is capped at 25 credits/month (1 credit ≈ 1GB
 * storage/bandwidth, or 1,000 transformations) and, unlike a
 * pay-as-you-go cloud bill, exceeding the quota on the free/fixed
 * tiers SUSPENDS the account rather than charging an overage — assets
 * become temporarily inaccessible until the plan is upgraded or usage
 * drops. This is acceptable for a portfolio/learning project but is a
 * real operational risk for a production law firm system handling
 * case-critical documents; see the README for the production
 * alternative (AWS S3 / Cloudflare R2 with no suspension behavior).
 *
 * If Cloudinary credentials aren't configured, the app falls back to
 * local disk storage automatically (see middlewares/upload.js) so the
 * document module keeps working without any cloud account.
 */
let configured = false;

const initCloudinary = () => {
  if (configured) return cloudinary;

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    logger.warn(
      'Cloudinary credentials are not set — falling back to local disk storage for document uploads.'
    );
    return null;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  configured = true;
  logger.info('Cloudinary configured successfully (document uploads will be stored in the cloud).');
  return cloudinary;
};

const isCloudinaryEnabled = () => Boolean(initCloudinary());

module.exports = { initCloudinary, isCloudinaryEnabled, cloudinary };
