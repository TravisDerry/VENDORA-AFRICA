// Vendora listing pricing. The app and website read it from GET /api/payments/config.
//
// The numbers below are the DEFAULTS. Prices, the free days and the grace days can be changed
// on the admin page (Settings); those changes are saved in the database (services/settings.js)
// and applied here with apply(), without restarting the server.
//
// How it works:
//  - A new business gets FREE_DAYS free (all features).
//  - After that the owner pays the monthly price for their business category with Mobile Money.
//    Each payment adds PERIOD_DAYS (paying early adds to the end).
//  - If the time runs out, the business gets GRACE_DAYS of reminders while still listed.
//  - After the grace period the business is hidden from customers until it pays again.

const PERIOD_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

const DEFAULT_FREE_DAYS = 30;
const DEFAULT_GRACE_DAYS = 7;

// GHS per month, by business category
const DEFAULT_PRICES = Object.freeze({
  food: 20,
  cosmetics: 30,
  fashion: 30,
  education: 30,
  other: 30,
  phones: 50,
  hardware: 50,
  aluminum: 50,
});

const CATEGORY_NAMES = {
  food: 'Food & grocery',
  cosmetics: 'Cosmetics & beauty',
  fashion: 'Fashion & clothing',
  education: 'Education & training',
  other: 'Other businesses',
  phones: 'Phones & electronics',
  hardware: 'Hardware & building',
  aluminum: 'Aluminium & glass works',
};

const LIMITS = { minPrice: 1, maxPrice: 100000, maxFreeDays: 365, maxGraceDays: 90 };

// Current values (defaults until the admin saves something)
let state = { freeDays: DEFAULT_FREE_DAYS, graceDays: DEFAULT_GRACE_DAYS, prices: { ...DEFAULT_PRICES } };

// Check new values from the admin page. Returns { value } or { error }.
function validate(input = {}) {
  const prices = { ...state.prices };
  if (input.prices !== undefined) {
    if (!input.prices || typeof input.prices !== 'object') return { error: 'Prices are missing' };
    for (const [id, raw] of Object.entries(input.prices)) {
      if (!(id in DEFAULT_PRICES)) return { error: `Unknown business type: ${id}` };
      const n = Number(raw);
      if (!Number.isFinite(n) || n < LIMITS.minPrice || n > LIMITS.maxPrice) {
        return { error: `${CATEGORY_NAMES[id]}: enter a price between GHS ${LIMITS.minPrice} and GHS ${LIMITS.maxPrice.toLocaleString('en')}` };
      }
      prices[id] = Math.round(n * 100) / 100;
    }
  }
  const whole = (raw, fallback, max, label) => {
    if (raw === undefined) return { n: fallback };
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > max) return { error: `${label}: enter a whole number from 0 to ${max}` };
    return { n };
  };
  const free = whole(input.freeDays, state.freeDays, LIMITS.maxFreeDays, 'Free days');
  if (free.error) return free;
  const grace = whole(input.graceDays, state.graceDays, LIMITS.maxGraceDays, 'Grace days');
  if (grace.error) return grace;
  return { value: { prices, freeDays: free.n, graceDays: grace.n } };
}

// Use values saved in the database (null = back to the defaults). Bad saved values are ignored.
function apply(saved) {
  const base = { freeDays: DEFAULT_FREE_DAYS, graceDays: DEFAULT_GRACE_DAYS, prices: { ...DEFAULT_PRICES } };
  if (!saved || typeof saved !== 'object') { state = base; return state; }
  const prev = state;
  state = base;
  const prices = {};
  Object.entries(saved.prices || {}).forEach(([id, p]) => { if (id in DEFAULT_PRICES) prices[id] = p; });
  const checked = validate({ prices, freeDays: saved.freeDays, graceDays: saved.graceDays });
  state = checked.value || prev;
  return state;
}

const monthlyPrice = (category) => state.prices[category] ?? state.prices.other;

// Subscription for a brand-new business
const freeMonth = (now = new Date()) => ({
  startDate: now,
  endDate: new Date(now.getTime() + state.freeDays * DAY),
  trial: true,
  autoRenew: false,
});

// Where a business stands right now. Businesses with no end date yet are treated as active
// (run `npm run start-free-month` once to give existing businesses their free month).
function listingStatus(business, now = new Date()) {
  const sub = business?.subscription || {};
  const price = monthlyPrice(business?.category);
  if (!sub.endDate) {
    return { status: 'active', trial: false, endsAt: null, graceEndsAt: null, daysLeft: null, monthlyPrice: price, visible: true };
  }
  const end = new Date(sub.endDate);
  const graceEnd = new Date(end.getTime() + state.graceDays * DAY);
  let status;
  if (now < end) status = sub.trial ? 'trial' : 'active';
  else if (now < graceEnd) status = 'grace';
  else status = 'expired';
  const target = status === 'grace' ? graceEnd : end;
  return {
    status, // trial | active | grace | expired
    trial: !!sub.trial,
    endsAt: end.toISOString(),
    graceEndsAt: graceEnd.toISOString(),
    daysLeft: status === 'expired' ? 0 : Math.max(0, Math.ceil((target - now) / DAY)),
    monthlyPrice: price,
    visible: status !== 'expired',
  };
}

// Mongo filter: businesses customers may see (no end date, or end date + grace still ahead)
const visibleFilter = (now = new Date()) => ({
  $or: [
    { 'subscription.endDate': { $exists: false } },
    { 'subscription.endDate': null },
    { 'subscription.endDate': { $gt: new Date(now.getTime() - state.graceDays * DAY) } },
  ],
});

module.exports = {
  get FREE_DAYS() { return state.freeDays; },
  get GRACE_DAYS() { return state.graceDays; },
  get CATEGORY_PRICES() { return { ...state.prices }; },
  PERIOD_DAYS,
  DAY,
  DEFAULT_PRICES,
  DEFAULT_FREE_DAYS,
  DEFAULT_GRACE_DAYS,
  CATEGORY_NAMES,
  LIMITS,
  validate,
  apply,
  monthlyPrice,
  freeMonth,
  listingStatus,
  visibleFilter,
};
