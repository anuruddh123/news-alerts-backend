const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema({
  categories: { type: [String], default: ['Technology', 'Business'] },
  sources: { type: [String], default: [] },
  notificationType: { type: String, enum: ['email', 'push', 'both'], default: 'email' },
  frequency: { type: String, enum: ['immediate', 'hourly', 'daily'], default: 'immediate' },
  breakingOnly: { type: Boolean, default: true },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  preferences: { type: preferenceSchema, default: () => ({}) },
  bookmarkedArticles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SavedArticle' }],
  pushSubscription: { type: Object, default: null },
  lastNotificationSentAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
