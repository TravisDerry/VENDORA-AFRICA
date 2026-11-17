// Help & support: contact details for the app, and messages sent from the app.
// Contact details come from .env (SUPPORT_PHONE, SUPPORT_WHATSAPP, SUPPORT_EMAIL, SUPPORT_HOURS).
// Read messages on the server with:  npm run support -- list
const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const SupportRequest = require('../models/SupportRequest');

const router = express.Router();
const TOPICS = ['account', 'payments', 'listing', 'orders', 'report', 'other'];

const digits = (v) => String(v || '').replace(/[^\d+]/g, '');

// Public: how customers and owners can reach Vendora
router.get('/info', (req, res) => {
  // SUPPORT_PHONE may hold several numbers separated by commas
  const phones = String(process.env.SUPPORT_PHONE || '').split(',').map(digits).filter(Boolean);
  res.json({
    phone: phones[0] || null,
    phones,
    whatsapp: digits(process.env.SUPPORT_WHATSAPP).replace(/^\+/, '') || null, // wa.me needs digits only
    email: (process.env.SUPPORT_EMAIL || '').trim() || null,
    hours: (process.env.SUPPORT_HOURS || '').trim() || null,
  });
});

// Public: send a message to the Vendora team
router.post('/requests', [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Enter your name'),
  body('phone').optional({ values: 'falsy' }).trim().matches(/^\+?[\d\s-]{9,16}$/).withMessage('Enter a valid phone number'),
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Enter a valid email address'),
  body('topic').optional().isIn(TOPICS),
  body('businessName').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('message').trim().isLength({ min: 10, max: 1500 }).withMessage('Please write at least a short sentence (10+ characters)'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    if (!req.body.phone && !req.body.email) return res.status(400).json({ error: 'Add a phone number or email so we can reply to you' });

    const reference = `SUP-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    await SupportRequest.create({
      reference,
      name: req.body.name,
      phone: req.body.phone || undefined,
      email: req.body.email || undefined,
      topic: req.body.topic || 'other',
      businessName: req.body.businessName || undefined,
      message: req.body.message,
    });
    console.log(`New support request ${reference} (${req.body.topic || 'other'})`);
    res.status(201).json({ reference });
  } catch (error) {
    console.error('Support request error:', error);
    res.status(500).json({ error: 'Could not send your message. Please try again.' });
  }
});

module.exports = router;
