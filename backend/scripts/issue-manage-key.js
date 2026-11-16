// Create (or replace) the owner key for an existing business.
// Usage:  npm run owner-key -- "Kankey man"      (business name or id)
// Prints the new key once. Give it only to the business owner; they enter it in the app
// (business page -> Products -> "Manage this business").
require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');
const Business = require('../models/Business');
const { generateManageKey, hashManageKey } = require('../utils/manageKey');

if (dns.getServers().every((s) => s === '127.0.0.1' || s === '::1')) dns.setServers(['8.8.8.8', '1.1.1.1']);

(async () => {
  const query = process.argv.slice(2).join(' ').trim();
  if (!query) {
    console.error('Usage: npm run owner-key -- "<business name or id>"');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  // Match the name exactly (ignoring upper/lower case); regex special characters are escaped.
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, (ch) => '\\' + ch);
  const filter = mongoose.Types.ObjectId.isValid(query)
    ? { _id: query }
    : { businessName: new RegExp('^' + escaped + '$', 'i') };
  const matches = await Business.find(filter).select('businessName email');
  if (matches.length !== 1) {
    console.error(matches.length ? `"${query}" matches ${matches.length} businesses; use the id instead:` : `No business found for "${query}"`);
    matches.forEach((b) => console.error(`  ${b._id}  ${b.businessName}`));
    process.exit(1);
  }
  const key = generateManageKey();
  await Business.updateOne({ _id: matches[0]._id }, { $set: { manageKeyHash: hashManageKey(key) } });
  console.log(`Business: ${matches[0].businessName}`);
  console.log('');
  console.log('OWNER KEY (copy this line into the app):');
  console.log('');
  console.log(`    ${key}`);
  console.log('');
  console.log('Shown once. Any previous key for this business no longer works.');
  console.log('Keep it private: anyone with this key can change this business\'s products.');
  await mongoose.disconnect();
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
