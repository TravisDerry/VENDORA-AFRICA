// Read and close messages sent from the app's Help & support page.
//
//   npm run support                          -> open messages (newest first)
//   npm run support -- all                   -> all messages
//   npm run support -- resolve SUP-261114-AB12CD   -> mark one as resolved
require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');
const SupportRequest = require('../models/SupportRequest');

if (dns.getServers().every((s) => s === '127.0.0.1' || s === '::1')) dns.setServers(['8.8.8.8', '1.1.1.1']);

(async () => {
  const [cmd = 'list', ref] = process.argv.slice(2);
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });

  if (cmd === 'resolve') {
    if (!ref) throw new Error('Usage: npm run support -- resolve <reference>');
    const r = await SupportRequest.findOneAndUpdate({ reference: ref.toUpperCase() }, { status: 'resolved', resolvedAt: new Date() }, { new: true });
    console.log(r ? `Marked ${r.reference} as resolved.` : `No message with reference ${ref}`);
  } else {
    const filter = cmd === 'all' ? {} : { status: 'open' };
    const list = await SupportRequest.find(filter).sort({ createdAt: -1 }).limit(50);
    if (!list.length) console.log(cmd === 'all' ? 'No support messages yet.' : 'No open support messages.');
    for (const r of list) {
      console.log('------------------------------------------------------------');
      console.log(`${r.reference}  [${r.status}]  ${r.createdAt.toLocaleString('en-GB')}  topic: ${r.topic}`);
      console.log(`From: ${r.name}${r.businessName ? ` (${r.businessName})` : ''}`);
      console.log(`Reply to: ${[r.phone, r.email].filter(Boolean).join('  /  ')}`);
      console.log('');
      console.log(r.message);
    }
    if (list.length) console.log('------------------------------------------------------------');
  }
  await mongoose.disconnect();
})().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
