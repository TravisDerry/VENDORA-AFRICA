// Vendora Admin API (used by the private admin page at /admin).
// Protected by ADMIN_PASSWORD in .env. Logging in returns a token valid for 12 hours.
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Business = require('../models/Business');
const Payment = require('../models/Payment');
const SupportRequest = require('../models/SupportRequest');
const pricing = require('../config/pricing');
const settings = require('../services/settings');
const { generateManageKey, hashManageKey } = require('../utils/manageKey');

const router = express.Router();
const TOKEN_HOURS = 12;

// The admin password is ADMIN_PASSWORD in .env until it is changed on the admin page (Settings);
// after that the new one (stored hashed in the database) is used instead.
// To go back to the .env password: npm run reset-admin-password
const envPassword = () => process.env.ADMIN_PASSWORD || '';
const isConfigured = () => !!settings.savedAdminPassword() || envPassword().length >= 10;
const MIN_PASSWORD = 10;
const MAX_PASSWORD = 128;
// Tokens are signed with JWT_SECRET plus the current password, so changing the password logs everyone out
const passwordFingerprint = () => {
  const saved = settings.savedAdminPassword();
  return saved ? `db:${saved.hash}` : `env:${envPassword()}`;
};
const signingKey = () => crypto.createHash('sha256').update(`${process.env.JWT_SECRET || ''}|admin|${passwordFingerprint()}`).digest();

const sha = (v) => crypto.createHash('sha256').update(String(v)).digest();
const passwordMatches = async (given) => {
  if (settings.savedAdminPassword()) return settings.checkSavedPassword(given);
  return crypto.timingSafeEqual(sha(given), sha(envPassword()));
};

router.use(async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  await settings.refresh();
  if (!isConfigured()) return res.status(503).json({ error: 'Admin is not set up. Add ADMIN_PASSWORD (at least 10 characters) to backend/.env and restart.' });
  next();
});

router.post('/login', async (req, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password.slice(0, MAX_PASSWORD + 1) : '';
  if (!password || !(await passwordMatches(password))) return res.status(401).json({ error: 'Wrong password' });
  const token = jwt.sign({ role: 'admin' }, signingKey(), { expiresIn: `${TOKEN_HOURS}h` });
  res.json({ token, expiresInHours: TOKEN_HOURS });
});

// Everything below needs a valid admin token
router.use((req, res, next) => {
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  try {
    const payload = jwt.verify(token, signingKey());
    if (payload.role !== 'admin') throw new Error('not admin');
    next();
  } catch (e) {
    res.status(401).json({ error: 'Please log in again' });
  }
});

const ownerName = (b) => [b.owner?.firstName, b.owner?.lastName].filter(Boolean).join(' ');
const adminBusiness = (b) => ({
  id: String(b._id),
  name: b.businessName,
  category: b.category,
  ownerName: ownerName(b),
  phone: b.phoneNumber || '',
  email: b.email || '',
  city: b.location?.city || '',
  country: b.country || '',
  createdAt: b.createdAt,
  products: (b.products || []).length,
  hasPhoto: !!b.images?.cover,
  acceptsPayments: !!b.acceptsPayments,
  verified: !!b.verified,
  verifiedAt: b.verifiedAt || null,
  verificationNote: b.verificationNote || '',
  listing: pricing.listingStatus(b),
});

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/summary', async (req, res) => {
  try {
    const businesses = await Business.find({}).select('verified category subscription');
    const listing = { trial: 0, active: 0, grace: 0, expired: 0 };
    businesses.forEach((b) => { listing[pricing.listingStatus(b).status] += 1; });
    const sum = async (match) => {
      const [r] = await Payment.aggregate([{ $match: { status: 'success', ...match } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]);
      return { total: r ? r.total : 0, count: r ? r.count : 0 };
    };
    const live = { testMode: { $ne: true } };
    res.json({
      businesses: businesses.length,
      verified: businesses.filter((b) => b.verified).length,
      pendingVerification: businesses.filter((b) => !b.verified).length,
      listing,
      openSupport: await SupportRequest.countDocuments({ status: 'open' }),
      listingRevenue: await sum({ purpose: 'plan', ...live }), // paid to Vendora
      customerPayments: await sum({ purpose: 'order', ...live }), // paid to businesses
      testPayments: (await sum({ testMode: true })).count,
    });
  } catch (error) {
    console.error('Admin summary error:', error);
    res.status(500).json({ error: 'Could not load the overview' });
  }
});

router.get('/businesses', async (req, res) => {
  try {
    const filter = {};
    if (req.query.filter === 'pending') filter.verified = { $ne: true };
    if (req.query.filter === 'verified') filter.verified = true;
    const q = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    if (q) {
      const rx = new RegExp(escapeRegex(q).replace(/['’‘`]/g, "['’‘`]"), 'i');
      filter.$or = [{ businessName: rx }, { phoneNumber: rx }, { email: rx }, { 'location.city': rx }];
    }
    const list = await Business.find(filter)
      .select('businessName category owner phoneNumber email location country createdAt products images acceptsPayments verified verifiedAt verificationNote subscription')
      .sort({ createdAt: req.query.filter === 'pending' ? 1 : -1 })
      .limit(200);
    res.json({ businesses: list.map(adminBusiness) });
  } catch (error) {
    console.error('Admin businesses error:', error);
    res.status(500).json({ error: 'Could not load businesses' });
  }
});

const findBusiness = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) { res.status(404).json({ error: 'Business not found' }); return null; }
  const b = await Business.findById(req.params.id);
  if (!b) { res.status(404).json({ error: 'Business not found' }); return null; }
  return b;
};

router.post('/businesses/:id/verify', async (req, res) => {
  try {
    const b = await findBusiness(req, res);
    if (!b) return;
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 300) : '';
    // First approval: the free month starts today (owners don't lose free days while waiting)
    if (!b.verified && !b.verifiedAt && b.subscription?.trial) b.subscription = { ...pricing.freeMonth(new Date()) };
    b.verified = true;
    b.status = 'active';
    b.verifiedAt = new Date();
    if (note) b.verificationNote = note;
    await b.save();
    res.json({ business: adminBusiness(b) });
  } catch (error) {
    console.error('Admin verify error:', error);
    res.status(500).json({ error: 'Could not verify the business' });
  }
});

router.post('/businesses/:id/unverify', async (req, res) => {
  try {
    const b = await findBusiness(req, res);
    if (!b) return;
    b.verified = false;
    b.verifiedAt = undefined;
    b.verificationNote = undefined;
    await b.save();
    res.json({ business: adminBusiness(b) });
  } catch (error) {
    console.error('Admin unverify error:', error);
    res.status(500).json({ error: 'Could not update the business' });
  }
});

// New owner key for an owner who lost theirs (the old key stops working). Shown once.
router.post('/businesses/:id/owner-key', async (req, res) => {
  try {
    const b = await findBusiness(req, res);
    if (!b) return;
    const key = generateManageKey();
    await Business.updateOne({ _id: b._id }, { $set: { manageKeyHash: hashManageKey(key) } });
    console.log(`Admin issued a new owner key for business ${b._id}`);
    res.json({ ownerKey: key, business: adminBusiness(b) });
  } catch (error) {
    console.error('Admin owner key error:', error);
    res.status(500).json({ error: 'Could not create a new key' });
  }
});

router.get('/support', async (req, res) => {
  try {
    const filter = req.query.status === 'all' ? {} : { status: 'open' };
    const list = await SupportRequest.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({
      requests: list.map((r) => ({
        reference: r.reference, name: r.name, phone: r.phone || '', email: r.email || '', topic: r.topic,
        businessName: r.businessName || '', message: r.message, status: r.status, createdAt: r.createdAt, resolvedAt: r.resolvedAt || null,
      })),
    });
  } catch (error) {
    console.error('Admin support error:', error);
    res.status(500).json({ error: 'Could not load messages' });
  }
});

router.post('/support/:reference/:action(resolve|reopen)', async (req, res) => {
  try {
    const resolve = req.params.action === 'resolve';
    const r = await SupportRequest.findOneAndUpdate(
      { reference: String(req.params.reference).toUpperCase() },
      resolve ? { status: 'resolved', resolvedAt: new Date() } : { status: 'open', $unset: { resolvedAt: 1 } },
      { new: true },
    );
    if (!r) return res.status(404).json({ error: 'Message not found' });
    res.json({ reference: r.reference, status: r.status });
  } catch (error) {
    console.error('Admin support update error:', error);
    res.status(500).json({ error: 'Could not update the message' });
  }
});

router.get('/payments', async (req, res) => {
  try {
    const list = await Payment.find({ status: 'success' }).sort({ paidAt: -1 }).limit(100);
    res.json({
      payments: list.map((p) => ({
        reference: p.reference, purpose: p.purpose, businessName: p.businessName || '', amount: p.amount, currency: p.currency,
        customerName: p.customerName || '', productName: p.productName || '', provider: p.provider, paidAt: p.paidAt, testMode: !!p.testMode,
      })),
    });
  } catch (error) {
    console.error('Admin payments error:', error);
    res.status(500).json({ error: 'Could not load payments' });
  }
});

// ---------- Settings: prices and admin password ----------
const settingsView = () => {
  const saved = settings.savedAdminPassword();
  return {
    pricing: settings.pricingSnapshot(),
    password: { source: saved ? 'admin' : 'env', changedAt: saved ? saved.changedAt : null, minLength: MIN_PASSWORD },
  };
};

router.get('/settings', (req, res) => res.json(settingsView()));

router.put('/settings/pricing', async (req, res) => {
  try {
    const body = req.body || {};
    const result = await settings.savePricing({ prices: body.prices, freeDays: body.freeDays, graceDays: body.graceDays });
    if (result.error) return res.status(400).json({ error: result.error });
    console.log('Admin updated listing prices');
    res.json(settingsView());
  } catch (error) {
    console.error('Admin pricing error:', error);
    res.status(500).json({ error: 'Could not save the prices' });
  }
});

router.post('/settings/password', async (req, res) => {
  try {
    const current = typeof req.body?.current === 'string' ? req.body.current.slice(0, MAX_PASSWORD + 1) : '';
    const next = typeof req.body?.next === 'string' ? req.body.next : '';
    if (!current || !(await passwordMatches(current))) return res.status(400).json({ error: 'Your current password is wrong' });
    if (next.length < MIN_PASSWORD) return res.status(400).json({ error: `The new password must be at least ${MIN_PASSWORD} characters` });
    if (next.length > MAX_PASSWORD) return res.status(400).json({ error: `The new password must be at most ${MAX_PASSWORD} characters` });
    if (next.trim() !== next) return res.status(400).json({ error: 'The new password cannot start or end with a space' });
    if (next === current) return res.status(400).json({ error: 'The new password must be different from the current one' });
    await settings.saveAdminPassword(next);
    console.log('Admin password changed from the admin page; all admin sessions were signed out');
    res.json({ ok: true });
  } catch (error) {
    console.error('Admin password error:', error);
    res.status(500).json({ error: 'Could not change the password' });
  }
});

module.exports = router;
