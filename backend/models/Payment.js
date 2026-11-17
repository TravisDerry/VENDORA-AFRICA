const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true, index: true },
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  // plan: a business paying Vendora for its plan. order: a customer paying a business.
  purpose: { type: String, enum: ['plan', 'order'], default: 'plan' },
  plan: { type: String, enum: ['basic', 'standard', 'premium'] }, // older plan payments
  category: String, // listing payments: the business category that set the price
  amount: { type: Number, required: true }, // GHS
  currency: { type: String, default: 'GHS' },
  phone: { type: String, required: true },
  provider: { type: String, required: true },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  message: String,
  testMode: Boolean,
  paidAt: Date,
  planActivated: { type: Boolean, default: false },
  // order details
  businessName: String,
  customerName: String,
  note: String,
  productId: String,
  productName: String,
  quantity: Number,
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
