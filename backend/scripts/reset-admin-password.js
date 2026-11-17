// Forgot the admin password you set on the admin page?
//
//   npm run reset-admin-password
//
// Removes the password saved from the admin page, so ADMIN_PASSWORD in backend/.env works again.
// Everyone logged in to the admin page is signed out.
require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');
const Setting = require('../models/Setting');

if (dns.getServers().every((s) => s === '127.0.0.1' || s === '::1')) dns.setServers(['8.8.8.8', '1.1.1.1']);

(async () => {
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 10) {
    console.error('ADMIN_PASSWORD in backend/.env is missing or shorter than 10 characters. Set it first, then run this again.');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vendora-africa', { serverSelectionTimeoutMS: 15000 });
    const { deletedCount } = await Setting.deleteOne({ key: 'adminPassword' });
    console.log(deletedCount
      ? 'Done. Log in to the admin page with ADMIN_PASSWORD from backend/.env (within 30 seconds the running server picks this up).'
      : 'No password was set on the admin page. ADMIN_PASSWORD from backend/.env is already the one in use.');
  } catch (e) {
    console.error('Could not reach the database:', e.message.replace(/mongodb(\+srv)?:\/\/[^\s]+/g, '[database]'));
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
