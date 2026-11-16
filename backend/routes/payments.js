// Mobile Money payments for Vendora plans, through Paystack.
// Flow: POST /plan (owner key) -> customer approves on their phone (or enters an OTP)
//       -> app polls GET /:reference, or Paystack calls POST /webhook -> plan is activated.
// Prices are set here on the server; the app never decides how much is charged.
const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Business = require('../models/Business');
const paystack = require('../services/paystack');
const businessRoutes = require('./businesses');

const router = express.Router();
const { findOwnedBusiness, useMemoryStore, approvalRequired } = businessRoutes;
const approved = (b) => !approvalRequired() || !!b.verified;

const pricing = require('../config/pricing'); // monthly listing price by business category
const memoryPayments = [];

const ORDER_MIN = 1;
const ORDER_MAX = 10000; // GHS per payment
const maskPhone = (phone) => (phone ? String(phone).replace(/^(\d{3})\d+(\d{3})$/, '$1 **** $2') : '');

const publicPayment = (p, extra = {}) => ({
  reference: p.reference,
  purpose: p.purpose || 'plan',
  plan: p.plan,
  category: p.category || '',
  businessName: p.businessName || '',
  productName: p.productName || '',
  quantity: p.quantity || null,
  customerName: p.customerName || '',
  amount: p.amount,
  currency: p.currency,
  provider: p.provider,
  status: p.status,
  message: p.message || '',
  testMode: !!p.testMode,
  paidAt: p.paidAt || null,
  createdAt: p.createdAt || null,
  ...extra,
});

async function findPayment(reference) {
  if (useMemoryStore()) return memoryPayments.find((p) => p.reference === reference) || null;
  return Payment.findOne({ reference });
}

async function savePayment(payment, changes) {
  Object.assign(payment, changes);
  if (!useMemoryStore()) await payment.save();
  return payment;
}

// Give the business the plan for 30 days (added on top of any time left). Runs once per payment.
async function activatePlan(payment) {
  if (useMemoryStore()) {
    if (payment.planActivated) return;
    payment.planActivated = true;
    const business = businessRoutes.memoryBusinesses?.find((b) => b._id === payment.business);
    if (business) extendPlan(business, payment);
    return;
  }
  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, planActivated: false },
    { $set: { planActivated: true } },
  );
  if (!claimed) return;
  payment.planActivated = true;
  const business = await Business.findById(payment.business);
  if (!business) return;
  extendPlan(business, payment);
  await business.save();
}

// Add one paid month. Paying before the current (free or paid) month ends adds to the end of it.
function extendPlan(business, payment) {
  const now = new Date();
  const sub = business.subscription || {};
  const stillRunning = sub.endDate && new Date(sub.endDate) > now;
  const start = stillRunning ? new Date(sub.endDate) : now;
  business.subscription = {
    startDate: stillRunning && sub.startDate ? sub.startDate : now,
    endDate: new Date(start.getTime() + pricing.PERIOD_DAYS * pricing.DAY),
    autoRenew: false,
    lastPayment: payment.paidAt || now,
    trial: false,
  };
}

// Map a Paystack charge/verify response onto our payment record
async function applyPaystackResult(payment, data) {
  const status = data.status;
  if (status === 'success') {
    // Only accept the exact amount and currency we asked for
    const paidPesewas = Number(data.amount);
    if (paidPesewas !== Math.round(payment.amount * 100) || (data.currency && data.currency !== payment.currency)) {
      await savePayment(payment, { status: 'failed', message: 'Amount paid does not match the listing price. Contact support.' });
      return { step: 'failed' };
    }
    await savePayment(payment, { status: 'success', message: 'Payment received', paidAt: data.paid_at ? new Date(data.paid_at) : new Date() });
    if (payment.purpose !== 'order') await activatePlan(payment);
    return { step: 'success' };
  }
  if (['failed', 'abandoned', 'reversed'].includes(status)) {
    await savePayment(payment, { status: 'failed', message: data.gateway_response || data.message || 'Payment was not completed' });
    return { step: 'failed' };
  }
  if (status === 'send_otp') {
    await savePayment(payment, { message: data.display_text || 'Enter the code sent to your phone' });
    return { step: 'otp' };
  }
  // pay_offline, pending, ongoing: waiting for the customer to approve on their phone
  await savePayment(payment, { message: data.display_text || 'Approve the payment prompt on your phone' });
  return { step: 'approve' };
}

// What the app needs to show the payment option
router.get('/config', (req, res) => {
  res.json({
    enabled: paystack.isConfigured(),
    testMode: paystack.isTestMode(),
    currency: 'GHS',
    pricing: {
      freeDays: pricing.FREE_DAYS,
      periodDays: pricing.PERIOD_DAYS,
      graceDays: pricing.GRACE_DAYS,
      categories: Object.entries(pricing.CATEGORY_PRICES)
        .map(([id, price]) => ({ id, name: pricing.CATEGORY_NAMES[id] || id, price }))
        .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name)),
    },
    providers: Object.entries(paystack.PROVIDERS).map(([id, p]) => ({ id, name: p.name })),
  });
});

// Pay for one month of listing (price set by the business category). The owner's key is required.
router.post('/plan', [
  body('businessId').trim().notEmpty().withMessage('Business is required'),
  body('provider').isIn(Object.keys(paystack.PROVIDERS)).withMessage('Choose your Mobile Money network'),
  body('phone').trim().notEmpty().withMessage('Mobile Money number is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
    if (!paystack.isConfigured()) return res.status(503).json({ error: 'Payments are not switched on yet' });

    const phone = paystack.normalizeGhanaPhone(req.body.phone);
    if (!phone) return res.status(400).json({ error: 'Enter a valid Ghana Mobile Money number, e.g. 024 123 4567' });

    const owned = await findOwnedBusiness(req.body.businessId, req.get('x-manage-key'));
    if (owned.error) return res.status(owned.status).json({ error: owned.error });
    const business = owned.business;
    if (!approved(business)) {
      return res.status(400).json({ error: 'Your business is waiting for approval. Your free month starts when it is approved, so there is nothing to pay yet.' });
    }

    const record = {
      reference: `VND-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      business: business._id,
      purpose: 'plan',
      businessName: business.businessName,
      category: business.category,
      amount: pricing.monthlyPrice(business.category),
      currency: 'GHS',
      phone,
      provider: req.body.provider,
      status: 'pending',
      testMode: paystack.isTestMode(),
      planActivated: false,
    };
    const payment = useMemoryStore() ? record : new Payment(record);
    if (useMemoryStore()) memoryPayments.push(payment); else await payment.save();

    let data;
    try {
      data = await paystack.chargeMobileMoney({
        email: business.email,
        amount: payment.amount,
        phone,
        provider: payment.provider,
        reference: payment.reference,
        metadata: { businessId: String(business._id), category: business.category, purpose: 'listing' },
      });
    } catch (e) {
      await savePayment(payment, { status: 'failed', message: e.message });
      return res.status(402).json({ error: e.message || 'Payment could not be started', payment: publicPayment(payment, { step: 'failed' }) });
    }

    const { step } = await applyPaystackResult(payment, data);
    res.status(201).json({ payment: publicPayment(payment, { step }) });
  } catch (error) {
    console.error('Plan payment error:', error);
    res.status(500).json({ error: 'Failed to start payment' });
  }
});

// ---------- Customers paying businesses ----------

// Public: can customers pay this business in the app right now? (no side effects, unlike GET /businesses/:id)
router.get('/business/:businessId', async (req, res) => {
  try {
    let business;
    if (useMemoryStore()) business = businessRoutes.memoryBusinesses.find((b) => b._id === req.params.businessId);
    else if (mongoose.Types.ObjectId.isValid(req.params.businessId)) business = await Business.findById(req.params.businessId).select('acceptsPayments verified category subscription');
    if (!business) return res.status(404).json({ error: 'Business not found' });
    const listing = pricing.listingStatus(business);
    // acceptsPayments: the owner has set up payouts. listing.visible: the listing is paid (or in its free month / grace).
    res.json({ acceptsPayments: !!business.acceptsPayments && paystack.isConfigured() && approved(business), listing, approved: approved(business) });
  } catch (error) {
    console.error('Accepts payments error:', error);
    res.status(500).json({ error: 'Failed to check payments' });
  }
});

// Owner: see whether this business receives MoMo payments, and where to
router.get('/payout/:businessId', async (req, res) => {
  try {
    const owned = await findOwnedBusiness(req.params.businessId, req.get('x-manage-key'));
    if (owned.error) return res.status(owned.status).json({ error: owned.error });
    const payout = owned.business.payout || {};
    res.json({
      enabled: !!owned.business.acceptsPayments,
      provider: payout.provider || null,
      phone: maskPhone(payout.phone),
      accountName: payout.accountName || '',
      commissionPercent: Math.max(0, Math.min(50, Number(process.env.VENDORA_COMMISSION_PERCENT) || 0)),
    });
  } catch (error) {
    console.error('Get payout error:', error);
    res.status(500).json({ error: 'Failed to load payout settings' });
  }
});

// Owner: set (or change) the MoMo number that receives customer payments
router.post('/payout/:businessId', [
  body('provider').isIn(Object.keys(paystack.PROVIDERS)).withMessage('Choose your Mobile Money network'),
  body('phone').trim().notEmpty().withMessage('Mobile Money number is required'),
  body('accountName').trim().isLength({ min: 2, max: 100 }).withMessage('Enter the name on the MoMo account'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    if (!paystack.isConfigured()) return res.status(503).json({ error: 'Payments are not switched on yet' });
    const phone = paystack.normalizeGhanaPhone(req.body.phone);
    if (!phone) return res.status(400).json({ error: 'Enter a valid Ghana Mobile Money number, e.g. 024 123 4567' });

    const owned = await findOwnedBusiness(req.params.businessId, req.get('x-manage-key'));
    if (owned.error) return res.status(owned.status).json({ error: owned.error });
    const business = owned.business;

    let sub;
    try {
      sub = await paystack.saveSubaccount({
        existingCode: business.payout?.subaccountCode,
        businessName: business.businessName,
        provider: req.body.provider,
        phone,
        description: `Vendora business ${business._id} (${req.body.accountName})`,
      });
    } catch (e) {
      return res.status(400).json({ error: e.message || 'Paystack could not use that MoMo number' });
    }

    business.payout = {
      provider: req.body.provider,
      phone,
      accountName: req.body.accountName,
      subaccountCode: sub.subaccount_code || business.payout?.subaccountCode,
      updatedAt: new Date(),
    };
    business.acceptsPayments = true;
    if (!useMemoryStore()) await business.save();
    res.json({ enabled: true, provider: req.body.provider, phone: maskPhone(phone), accountName: req.body.accountName });
  } catch (error) {
    console.error('Save payout error:', error);
    res.status(500).json({ error: 'Failed to save payout settings' });
  }
});

// Owner: stop receiving payments in the app
router.delete('/payout/:businessId', async (req, res) => {
  try {
    const owned = await findOwnedBusiness(req.params.businessId, req.get('x-manage-key'));
    if (owned.error) return res.status(owned.status).json({ error: owned.error });
    owned.business.acceptsPayments = false;
    if (!useMemoryStore()) await owned.business.save();
    res.json({ enabled: false });
  } catch (error) {
    console.error('Disable payout error:', error);
    res.status(500).json({ error: 'Failed to update payout settings' });
  }
});

// Owner: payments customers have made to this business
router.get('/received/:businessId', async (req, res) => {
  try {
    const owned = await findOwnedBusiness(req.params.businessId, req.get('x-manage-key'));
    if (owned.error) return res.status(owned.status).json({ error: owned.error });
    const id = String(owned.business._id);
    const list = useMemoryStore()
      ? memoryPayments.filter((p) => String(p.business) === id && p.purpose === 'order' && p.status === 'success').slice(-50).reverse()
      : await Payment.find({ business: owned.business._id, purpose: 'order', status: 'success' }).sort({ paidAt: -1 }).limit(50);
    res.json({
      payments: list.map((p) => ({
        reference: p.reference,
        amount: p.amount,
        currency: p.currency,
        customerName: p.customerName || '',
        customerPhone: maskPhone(p.phone),
        productName: p.productName || '',
        quantity: p.quantity || null,
        note: p.note || '',
        provider: p.provider,
        paidAt: p.paidAt,
        testMode: !!p.testMode,
      })),
    });
  } catch (error) {
    console.error('Received payments error:', error);
    res.status(500).json({ error: 'Failed to load payments' });
  }
});

// Customer: pay a business (for a listed product, or any amount agreed with the seller)
router.post('/order', [
  body('businessId').trim().notEmpty().withMessage('Business is required'),
  body('provider').isIn(Object.keys(paystack.PROVIDERS)).withMessage('Choose your Mobile Money network'),
  body('phone').trim().notEmpty().withMessage('Mobile Money number is required'),
  body('customerName').trim().isLength({ min: 2, max: 80 }).withMessage('Enter your name so the seller knows who paid'),
  body('note').optional().trim().isLength({ max: 200 }).withMessage('Note must be under 200 characters'),
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Enter a valid email or leave it empty'),
  body('productId').optional({ values: 'falsy' }).trim().isLength({ max: 64 }),
  body('quantity').optional().isInt({ min: 1, max: 50 }).withMessage('Quantity must be 1-50').toInt(),
  body('amount').optional().isFloat({ min: ORDER_MIN, max: ORDER_MAX }).withMessage(`Amount must be GHS ${ORDER_MIN} - ${ORDER_MAX}`).toFloat(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    if (!paystack.isConfigured()) return res.status(503).json({ error: 'Payments are not switched on yet' });
    const phone = paystack.normalizeGhanaPhone(req.body.phone);
    if (!phone) return res.status(400).json({ error: 'Enter a valid Ghana Mobile Money number, e.g. 024 123 4567' });

    let business;
    if (useMemoryStore()) business = businessRoutes.memoryBusinesses.find((b) => b._id === req.body.businessId);
    else if (mongoose.Types.ObjectId.isValid(req.body.businessId)) business = await Business.findById(req.body.businessId).select('+payout');
    if (!business) return res.status(404).json({ error: 'Business not found' });
    if (!pricing.listingStatus(business).visible || !approved(business)) {
      return res.status(400).json({ error: 'This business is not available right now.' });
    }
    if (!business.acceptsPayments || !business.payout?.subaccountCode) {
      return res.status(400).json({ error: 'This business does not accept in-app payments yet. Call or message them instead.' });
    }

    // Price comes from the product on the server, never from the app
    let amount;
    let product = null;
    const quantity = req.body.quantity || 1;
    if (req.body.productId) {
      product = (business.products || []).find((p) => String(p._id) === String(req.body.productId));
      if (!product) return res.status(404).json({ error: 'Product not found' });
      if (product.inStock === false) return res.status(400).json({ error: 'This product is out of stock' });
      if (!(typeof product.price === 'number' && product.price > 0)) return res.status(400).json({ error: 'This product has no price. Agree a price with the seller and pay an amount instead.' });
      amount = Math.round(product.price * quantity * 100) / 100;
    } else {
      if (!req.body.amount) return res.status(400).json({ error: 'Enter the amount to pay' });
      amount = Math.round(req.body.amount * 100) / 100;
    }
    if (amount < ORDER_MIN || amount > ORDER_MAX) return res.status(400).json({ error: `Payments must be between GHS ${ORDER_MIN} and GHS ${ORDER_MAX}` });

    const record = {
      reference: `VND-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      business: business._id,
      purpose: 'order',
      businessName: business.businessName,
      amount,
      currency: 'GHS',
      phone,
      provider: req.body.provider,
      status: 'pending',
      testMode: paystack.isTestMode(),
      createdAt: new Date(),
      customerName: req.body.customerName,
      note: req.body.note || '',
      productId: product ? String(product._id) : undefined,
      productName: product ? product.name : undefined,
      quantity: product ? quantity : undefined,
    };
    const payment = useMemoryStore() ? record : new Payment(record);
    if (useMemoryStore()) memoryPayments.push(payment); else await payment.save();

    let data;
    try {
      data = await paystack.chargeMobileMoney({
        // Paystack needs an email for its receipt; customers without one get a non-deliverable placeholder
        email: req.body.email || `momo-${phone}@example.com`,
        amount,
        phone,
        provider: payment.provider,
        reference: payment.reference,
        subaccount: business.payout.subaccountCode,
        metadata: { businessId: String(business._id), purpose: 'order', productId: record.productId || null, customerName: record.customerName },
      });
    } catch (e) {
      await savePayment(payment, { status: 'failed', message: e.message });
      return res.status(402).json({ error: e.message || 'Payment could not be started', payment: publicPayment(payment, { step: 'failed' }) });
    }

    const { step } = await applyPaystackResult(payment, data);
    res.status(201).json({ payment: publicPayment(payment, { step }) });
  } catch (error) {
    console.error('Order payment error:', error);
    res.status(500).json({ error: 'Failed to start payment' });
  }
});

// Some networks (Telecel) send a one-time code that the customer types in the app
router.post('/:reference/otp', [
  body('otp').trim().matches(/^\d{4,8}$/).withMessage('Enter the code from your phone'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const payment = await findPayment(req.params.reference);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'pending') return res.json({ payment: publicPayment(payment, { step: payment.status }) });

    let data;
    try {
      data = await paystack.submitOtp(payment.reference, req.body.otp);
    } catch (e) {
      return res.status(400).json({ error: e.message || 'That code did not work' });
    }
    const { step } = await applyPaystackResult(payment, data);
    res.json({ payment: publicPayment(payment, { step }) });
  } catch (error) {
    console.error('OTP error:', error);
    res.status(500).json({ error: 'Failed to submit code' });
  }
});

// The app polls this while the customer approves on their phone
router.get('/:reference', async (req, res) => {
  try {
    const payment = await findPayment(req.params.reference);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'pending') return res.json({ payment: publicPayment(payment, { step: payment.status }) });

    let step = 'approve';
    try {
      const data = await paystack.verifyTransaction(payment.reference);
      ({ step } = await applyPaystackResult(payment, data));
    } catch (e) {
      // Not final yet (or Paystack unreachable): keep waiting
    }
    res.json({ payment: publicPayment(payment, { step }) });
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ error: 'Failed to check payment' });
  }
});

// Paystack -> Vendora. Set this URL in Paystack Dashboard > Settings > API Keys & Webhooks:
//   https://<your-api-domain>/api/payments/webhook
router.post('/webhook', async (req, res) => {
  if (!paystack.webhookSignatureValid(req.rawBody, req.get('x-paystack-signature'))) {
    return res.sendStatus(401);
  }
  res.sendStatus(200); // acknowledge quickly; Paystack retries otherwise
  try {
    const reference = req.body?.data?.reference;
    if (!reference || !['charge.success', 'charge.failed'].includes(req.body.event)) return;
    const payment = await findPayment(reference);
    if (!payment || payment.status !== 'pending') return;
    // Confirm with Paystack directly rather than trusting the webhook body alone
    const data = await paystack.verifyTransaction(reference);
    await applyPaystackResult(payment, data);
  } catch (error) {
    console.error('Webhook processing error:', error.message);
  }
});

module.exports = router;
