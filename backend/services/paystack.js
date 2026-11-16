// Paystack Mobile Money (Ghana: MTN MoMo, Telecel/Vodafone Cash, AirtelTigo Money).
// Needs PAYSTACK_SECRET_KEY in .env (sk_test_... for testing, sk_live_... for real money).
// Docs: https://paystack.com/docs/api/charge/
const crypto = require('crypto');

const BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

// App provider id -> Paystack provider code (charges) and settlement bank code (payouts)
const PROVIDERS = {
  mtn: { code: 'mtn', bank: 'MTN', name: 'MTN MoMo' },
  telecel: { code: 'vod', bank: 'VOD', name: 'Telecel Cash' },
  airteltigo: { code: 'atl', bank: 'ATL', name: 'AirtelTigo Money' },
};

const secretKey = () => process.env.PAYSTACK_SECRET_KEY || '';
const isConfigured = () => /^sk_(test|live)_/.test(secretKey());
const isTestMode = () => secretKey().startsWith('sk_test_');

async function call(method, path, body) {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  let json = {};
  try { json = await res.json(); } catch (e) { /* empty body */ }
  if (!res.ok || json.status === false) {
    const err = new Error(json.message || `Paystack error ${res.status}`);
    err.data = json.data;
    throw err;
  }
  return json.data || {};
}

// Ghana numbers: 024 123 4567 / +233 24 123 4567 -> 0241234567
function normalizeGhanaPhone(input) {
  let digits = String(input || '').replace(/\D/g, '');
  if (digits.startsWith('233')) digits = '0' + digits.slice(3);
  if (digits.length === 9) digits = '0' + digits;
  return /^0[235]\d{8}$/.test(digits) ? digits : null;
}

// amount is in GHS; Paystack wants pesewas.
// With `subaccount`, Paystack settles the money to that business's MoMo; the business bears Paystack's fee.
function chargeMobileMoney({ email, amount, phone, provider, reference, metadata, subaccount }) {
  return call('POST', '/charge', {
    email,
    amount: Math.round(amount * 100),
    currency: 'GHS',
    reference,
    mobile_money: { phone, provider: PROVIDERS[provider].code },
    metadata,
    ...(subaccount ? { subaccount, bearer: 'subaccount' } : {}),
  });
}

// A business's payout account: customer payments to it are settled to this MoMo number.
// percentage_charge is Vendora's commission (VENDORA_COMMISSION_PERCENT, default 0).
function saveSubaccount({ existingCode, businessName, provider, phone, description }) {
  const body = {
    business_name: businessName,
    settlement_bank: PROVIDERS[provider].bank,
    account_number: phone,
    percentage_charge: Math.max(0, Math.min(50, Number(process.env.VENDORA_COMMISSION_PERCENT) || 0)),
    description,
  };
  return existingCode
    ? call('PUT', `/subaccount/${encodeURIComponent(existingCode)}`, body)
    : call('POST', '/subaccount', body);
}

const submitOtp = (reference, otp) => call('POST', '/charge/submit_otp', { otp, reference });
const verifyTransaction = (reference) => call('GET', `/transaction/verify/${encodeURIComponent(reference)}`);

// Webhook requests are signed with HMAC-SHA512 of the raw body using the secret key
function webhookSignatureValid(rawBody, signature) {
  if (!rawBody || !signature || !isConfigured()) return false;
  const expected = crypto.createHmac('sha512', secretKey()).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = {
  PROVIDERS,
  isConfigured,
  isTestMode,
  normalizeGhanaPhone,
  chargeMobileMoney,
  saveSubaccount,
  submitOtp,
  verifyTransaction,
  webhookSignatureValid,
};
