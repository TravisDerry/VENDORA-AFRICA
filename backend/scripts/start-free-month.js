// One-off: give every existing business its free month starting today.
// Businesses that already have paid time left keep it unchanged.
//
//   npm run start-free-month            -> shows what would change (no changes made)
//   npm run start-free-month -- --apply -> makes the changes
require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');
const Business = require('../models/Business');
const pricing = require('../config/pricing');

if (dns.getServers().every((s) => s === '127.0.0.1' || s === '::1')) dns.setServers(['8.8.8.8', '1.1.1.1']);

(async () => {
  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  const now = new Date();
  const all = await Business.find({}).select('businessName category subscription');
  let changed = 0;
  for (const b of all) {
    const end = b.subscription?.endDate ? new Date(b.subscription.endDate) : null;
    const price = pricing.monthlyPrice(b.category);
    if (end && end > now) {
      console.log(`  keep   ${b.businessName}: already has time until ${end.toDateString()} (then GHS ${price}/month)`);
      continue;
    }
    changed += 1;
    const sub = pricing.freeMonth(now);
    console.log(`  ${apply ? 'set ' : 'would'}  ${b.businessName}: free until ${sub.endDate.toDateString()} (then GHS ${price}/month)`);
    if (apply) {
      await Business.updateOne({ _id: b._id }, {
        $set: { 'subscription.startDate': sub.startDate, 'subscription.endDate': sub.endDate, 'subscription.trial': true },
      });
    }
  }
  console.log('');
  console.log(apply
    ? `Done: ${changed} business(es) got a free month.`
    : `${changed} business(es) would get a free month. Run again with --apply to make the change.`);
  await mongoose.disconnect();
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
