// Safety check when the backend runs on a real server (NODE_ENV=production).
// Missing or placeholder secrets would let people forge logins or would silently lose data,
// so the server refuses to start until they are fixed. Warnings are printed for settings that
// are optional but usually wanted.
const PLACEHOLDER = /your-|change-this|changeme|example|secret-key$/i;

function checkProductionConfig(env = process.env) {
  if (env.NODE_ENV !== 'production') return { errors: [], warnings: [] };
  const errors = [];
  const warnings = [];

  const jwt = env.JWT_SECRET || '';
  if (jwt.length < 32 || PLACEHOLDER.test(jwt)) {
    errors.push('JWT_SECRET must be a random value of at least 32 characters (it signs logins). Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  }
  const mongo = env.MONGODB_URI || '';
  if (!mongo || /localhost|127\.0\.0\.1/.test(mongo)) {
    errors.push('MONGODB_URI must point to your hosted database (e.g. MongoDB Atlas), not localhost.');
  }
  if ((env.ADMIN_PASSWORD || '').length < 10) {
    warnings.push('ADMIN_PASSWORD is not set (or is shorter than 10 characters): the /admin page will not work.');
  }
  const paystack = env.PAYSTACK_SECRET_KEY || '';
  if (!paystack || PLACEHOLDER.test(paystack)) {
    warnings.push('PAYSTACK_SECRET_KEY is not set: Mobile Money payments are switched off.');
  } else if (paystack.startsWith('sk_test_')) {
    warnings.push('PAYSTACK_SECRET_KEY is a TEST key: no real money will be collected.');
  }
  if (!env.CLOUDINARY_URL) {
    warnings.push('CLOUDINARY_URL is not set: photos are saved on the server disk, which most hosts (Render, Railway) wipe on every deploy.');
  }
  if (!env.TRUST_PROXY) {
    warnings.push('TRUST_PROXY is not set: behind a host like Render, set TRUST_PROXY=1 so rate limits see real user IPs.');
  }
  return { errors, warnings };
}

module.exports = { checkProductionConfig };
