const mongoose = require('mongoose');

// A message sent from the app's Help & support page
const supportRequestSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  topic: { type: String, enum: ['account', 'payments', 'listing', 'orders', 'report', 'other'], default: 'other' },
  businessName: { type: String, trim: true },
  message: { type: String, required: true, trim: true },
  status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
  resolvedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('SupportRequest', supportRequestSchema);
