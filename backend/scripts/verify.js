// Check businesses and give them the Verified badge.
//
//   npm run verify                         -> businesses waiting to be checked (with contact details)
//   npm run verify -- all                  -> every business and its status
//   npm run verify -- <id or name>         -> mark a business as Verified
//   npm run verify -- <id or name> "called owner, visited shop"   -> ...with a note for your records
//   npm run verify -- remove <id or name>  -> take the Verified badge away
//
// Names can be typed in any case, and ' matches ’ (e.g.  npm run verify -- "can's catering").
require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');
const Business = require('../models/Business');

if (dns.getServers().every((s) => s === '127.0.0.1' || s === '::1')) dns.setServers(['8.8.8.8', '1.1.1.1']);

const FIELDS = 'businessName category owner phoneNumber email location country createdAt products verified verifiedAt verificationNote subscription';

const nameRegex = (name) => {
  const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, (ch) => '\\' + ch);
  return new RegExp('^' + escaped.replace(/['’‘`]/g, "['’‘`]") + '$', 'i');
};

async function findOne(query) {
  const matches = mongoose.Types.ObjectId.isValid(query) && /^[a-f\d]{24}$/i.test(query)
    ? await Business.find({ _id: query }).select(FIELDS)
    : await Business.find({ businessName: nameRegex(query) }).select(FIELDS);
  if (matches.length === 1) return matches[0];
  if (!matches.length) console.error(`No business found for "${query}". Run "npm run verify -- all" to see every business.`);
  else {
    console.error(`"${query}" matches ${matches.length} businesses. Use the id instead:`);
    matches.forEach((b) => console.error(`  ${b._id}  ${b.businessName}`));
  }
  return null;
}

const show = (b) => {
  const place = [b.location?.city, b.location?.address, b.country].filter(Boolean).join(', ');
  const owner = [b.owner?.firstName, b.owner?.lastName].filter(Boolean).join(' ');
  console.log('------------------------------------------------------------');
  console.log(`${b.businessName}   [${b.verified ? 'VERIFIED' : 'pending'}]`);
  console.log(`  id:        ${b._id}`);
  console.log(`  owner:     ${owner || '-'}   phone: ${b.phoneNumber || '-'}   email: ${b.email || '-'}`);
  console.log(`  category:  ${b.category}   location: ${place || '-'}`);
  console.log(`  joined:    ${b.createdAt ? b.createdAt.toLocaleDateString('en-GB') : '-'}   products: ${(b.products || []).length}`);
  if (b.verified) console.log(`  verified:  ${b.verifiedAt ? b.verifiedAt.toLocaleString('en-GB') : 'yes'}${b.verificationNote ? `  (${b.verificationNote})` : ''}`);
};

(async () => {
  const args = process.argv.slice(2);
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });

  if (args.length === 0 || args[0] === 'all') {
    const list = await Business.find(args[0] === 'all' ? {} : { verified: { $ne: true } }).select(FIELDS).sort({ createdAt: 1 });
    if (!list.length) console.log(args[0] === 'all' ? 'No businesses yet.' : 'No businesses waiting to be checked.');
    else {
      if (!args.length) console.log(`${list.length} business(es) waiting to be checked. Call the owner or visit, then run:  npm run verify -- <id>\n`);
      list.forEach(show);
      console.log('------------------------------------------------------------');
    }
  } else if (args[0] === 'remove') {
    const b = await findOne(args.slice(1).join(' '));
    if (b) {
      await Business.updateOne({ _id: b._id }, { $set: { verified: false }, $unset: { verifiedAt: 1, verificationNote: 1 } });
      console.log(`Removed the Verified badge from ${b.businessName}.`);
    } else process.exitCode = 1;
  } else {
    const [query, note] = args;
    const b = await findOne(query);
    if (b) {
      const now = new Date();
      // First approval: the free month starts today
      const restartTrial = !b.verified && !b.verifiedAt && b.subscription?.trial
        ? { 'subscription.startDate': now, 'subscription.endDate': new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), 'subscription.trial': true }
        : {};
      await Business.updateOne({ _id: b._id }, { $set: { verified: true, status: 'active', verifiedAt: now, ...restartTrial, ...(note ? { verificationNote: note } : {}) } });
      console.log(`${b.businessName} is now Verified. Customers will see the ✓ badge next time the app loads.`);
    } else process.exitCode = 1;
  }
  await mongoose.disconnect();
})().catch((e) => { console.error('Failed:', String(e.message).replace(/mongodb(\+srv)?:\/\/\S+/g, '<db address hidden>')); process.exit(1); });
