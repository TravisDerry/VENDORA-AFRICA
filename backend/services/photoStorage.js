// Where uploaded photos are kept.
//  - Default: the backend's own `uploads/` folder, served at /uploads/... (fine while the
//    backend runs on one computer; most hosts wipe local files on restart, so don't rely on it there).
//  - With CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name> in .env, photos go to
//    Cloudinary instead and the database stores their https link.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 5 * 1024 * 1024;

// Check the file really is an image by its first bytes, not just by what the phone says
function sniffType(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

function cloudinaryConfig() {
  const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(process.env.CLOUDINARY_URL || '');
  return m ? { apiKey: m[1], apiSecret: m[2], cloudName: m[3] } : null;
}

async function saveToCloudinary(buf, mime, folder) {
  const { apiKey, apiSecret, cloudName } = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest('hex');
  const form = new FormData();
  form.append('file', new Blob([buf], { type: mime }), `photo.${TYPES[mime]}`);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(60000) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.secure_url) throw new Error(json.error?.message || 'Photo upload failed');
  return json.secure_url;
}

async function saveToDisk(buf, mime) {
  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${TYPES[mime]}`;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), buf);
  return `/uploads/${name}`; // the app adds the server address in front
}

// Returns the stored photo's URL (https://... on Cloudinary, /uploads/... on disk)
async function savePhoto(buf, folder = 'vendora') {
  if (!buf || !buf.length) throw Object.assign(new Error('No photo received'), { status: 400 });
  if (buf.length > MAX_BYTES) throw Object.assign(new Error('Photo is too large (max 5 MB)'), { status: 400 });
  const mime = sniffType(buf);
  if (!mime) throw Object.assign(new Error('This photo type is not supported. Please choose a JPG or PNG photo (update the Vendora app if you see this often).'), { status: 400 });
  return cloudinaryConfig() ? saveToCloudinary(buf, mime, folder) : saveToDisk(buf, mime);
}

// Remove an old photo we stored on disk (Cloudinary photos are left in place)
async function deletePhoto(url) {
  if (typeof url !== 'string' || !/^\/uploads\/[\w.-]+$/.test(url)) return;
  try {
    await fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(url)));
  } catch (e) {
    // already gone
  }
}

module.exports = { savePhoto, deletePhoto, MAX_BYTES };
