// Settings saved from the admin page: listing prices and the admin password.
// Kept in MongoDB (Setting model) so they survive restarts and are shared by every server.
// A small in-memory copy is refreshed at most every 30 seconds.
const crypto = require('crypto');
const { promisify } = require('util');
const mongoose = require('mongoose');
const Setting = require('../models/Setting');
const pricing = require('../config/pricing');

const scrypt = promisify(crypto.scrypt);
const REFRESH_MS = 30 * 1000;
let loadedAt = 0;
let loading = null;
let adminPassword = null; // { hash, salt, changedAt } when changed on the admin page

async function load() {
  const docs = await Setting.find({ key: { $in: ['pricing', 'adminPassword'] } }).lean();
  const byKey = Object.fromEntries(docs.map((d) => [d.key, d.value]));
  pricing.apply(byKey.pricing || null);
  const pw = byKey.adminPassword;
  adminPassword = pw && typeof pw.hash === 'string' && typeof pw.salt === 'string' ? pw : null;
  loadedAt = Date.now();
}

// Refresh from the database if the copy is old. Never throws (keeps the last good values).
async function refresh(force = false) {
  if (mongoose.connection.readyState !== 1) return;
  if (!force && Date.now() - loadedAt < REFRESH_MS) return;
  if (!loading) loading = load().catch((e) => console.error('Settings load error:', e.message)).finally(() => { loading = null; });
  await loading;
}

// ---------- pricing ----------
const pricingSnapshot = () => ({
  freeDays: pricing.FREE_DAYS,
  graceDays: pricing.GRACE_DAYS,
  periodDays: pricing.PERIOD_DAYS,
  limits: pricing.LIMITS,
  categories: Object.entries(pricing.CATEGORY_PRICES).map(([id, price]) => ({
    id, name: pricing.CATEGORY_NAMES[id] || id, price, defaultPrice: pricing.DEFAULT_PRICES[id],
  })),
});

async function savePricing(input) {
  await refresh(true);
  const checked = pricing.validate(input);
  if (checked.error) return { error: checked.error };
  await Setting.updateOne({ key: 'pricing' }, { $set: { value: checked.value } }, { upsert: true });
  pricing.apply(checked.value);
  loadedAt = Date.now();
  return { pricing: pricingSnapshot() };
}

// ---------- admin password ----------
const hashPassword = async (plain, salt) => (await scrypt(String(plain), Buffer.from(salt, 'hex'), 64)).toString('hex');

async function checkSavedPassword(given) {
  if (!adminPassword) return false;
  const got = Buffer.from(await hashPassword(given, adminPassword.salt), 'hex');
  const want = Buffer.from(adminPassword.hash, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

async function saveAdminPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const value = { hash: await hashPassword(plain, salt), salt, changedAt: new Date() };
  await Setting.updateOne({ key: 'adminPassword' }, { $set: { value } }, { upsert: true });
  adminPassword = value;
  loadedAt = Date.now();
}

module.exports = {
  refresh,
  pricingSnapshot,
  savePricing,
  savedAdminPassword: () => adminPassword,
  checkSavedPassword,
  saveAdminPassword,
};
