const mongoose = require('mongoose');

const savedArticleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  url: { type: String, required: true },
  source: { type: String },
  category: { type: String },
  imageUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('SavedArticle', savedArticleSchema);
