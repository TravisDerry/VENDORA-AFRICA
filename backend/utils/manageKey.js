// Owner ("manage") keys let a business owner change their own listing without a password system.
// The plain key is returned to the owner's phone once; only a SHA-256 hash is stored in MongoDB.
const crypto = require('crypto');

const generateManageKey = () => crypto.randomBytes(24).toString('base64url');

const hashManageKey = (key) => crypto.createHash('sha256').update(String(key)).digest('hex');

const manageKeyMatches = (key, storedHash) => {
  if (!key || !storedHash) return false;
  const a = Buffer.from(hashManageKey(key), 'hex');
  const b = Buffer.from(String(storedHash), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

module.exports = { generateManageKey, hashManageKey, manageKeyMatches };
