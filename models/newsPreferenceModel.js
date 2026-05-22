const mongoose = require('mongoose');

const newsPreferenceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categories: { type: [String], default: [] },
  sources: { type: [String], default: [] },
  frequency: { type: String, enum: ['immediate', 'hourly', 'daily'], default: 'immediate' },
  notificationType: { type: String, enum: ['email', 'push', 'both'], default: 'email' },
  breakingOnly: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('NewsPreference', newsPreferenceSchema);
