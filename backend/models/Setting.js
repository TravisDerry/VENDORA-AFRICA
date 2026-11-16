// Settings changed from the admin page (prices, admin password), one document per key.
const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true, minimize: false });

module.exports = mongoose.model('Setting', settingSchema);
