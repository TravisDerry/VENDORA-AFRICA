// Copy photos that only exist on this computer (backend/uploads) to Cloudinary, and point the
// database at the Cloudinary copies, so they show on the hosted server too.
//
//   npm run move-photos            (needs CLOUDINARY_URL and MONGODB_URI in backend/.env)
//   npm run move-photos -- --dry   (only lists what would be moved)
//
// Safe to run more than once: photos already on Cloudinary are skipped. Local files are kept.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const mongoose = require('mongoose');
const { savePhoto } = require('../services/photoStorage');
const Business = require('../models/Business');

if (dns.getServers().every((s) => s === '127.0.0.1' || s === '::1')) dns.setServers(['8.8.8.8', '1.1.1.1']);

const DRY = process.argv.includes('--dry');
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const isLocal = (url) => typeof url === 'string' && /^\/uploads\/[\w.-]+$/.test(url);

async function moveOne(url, folder, label) {
  const file = path.join(UPLOAD_DIR, path.basename(url));
  if (!fs.existsSync(file)) {
    console.log(`  MISSING  ${label}: ${url} is not on this computer (it must be uploaded again in the app)`);
    return null;
  }
  if (DRY) {
    console.log(`  WOULD MOVE  ${label}: ${url}`);
    return null;
  }
  const newUrl = await savePhoto(fs.readFileSync(file), folder);
  console.log(`  MOVED  ${label}: ${newUrl}`);
  return newUrl;
}

async function main() {
  if (!/^cloudinary:\/\/[^:<>\s]+:[^@<>\s]+@[^\s<>]+$/.test(process.env.CLOUDINARY_URL || '')) {
    console.error('CLOUDINARY_URL in backend/.env is missing or still has the <placeholders>.');
    console.error('It must look like cloudinary://123456789012345:yourApiSecret@yourCloudName');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });

  const businesses = await Business.find({});
  let moved = 0;
  for (const b of businesses) {
    const name = b.businessName || b._id.toString();
    let changed = false;

    if (isLocal(b.images?.cover)) {
      const url = await moveOne(b.images.cover, 'vendora/covers', `${name} cover`);
      if (url) { b.set('images.cover', url); changed = true; moved++; }
    }
    const gallery = b.images?.gallery || [];
    for (let i = 0; i < gallery.length; i++) {
      if (!isLocal(gallery[i])) continue;
      const url = await moveOne(gallery[i], 'vendora/gallery', `${name} gallery #${i + 1}`);
      if (url) { b.set(`images.gallery.${i}`, url); changed = true; moved++; }
    }
    for (const p of b.products || []) {
      const imgs = p.images || [];
      for (let i = 0; i < imgs.length; i++) {
        const current = typeof imgs[i] === 'string' ? imgs[i] : imgs[i]?.url;
        if (!isLocal(current)) continue;
        const url = await moveOne(current, 'vendora/products', `${name} / ${p.name}`);
        if (!url) continue;
        if (typeof imgs[i] === 'string') imgs.set(i, url); else imgs[i].url = url;
        changed = true; moved++;
      }
    }
    if (changed) { b.markModified('products'); await b.save(); }
  }

  console.log(DRY ? '\nDry run: nothing was changed.' : `\nDone: ${moved} photo(s) moved to Cloudinary.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
