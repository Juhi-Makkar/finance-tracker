const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  emoji: { type: String, default: '🎯' },
  target: { type: Number, required: true },
  saved: { type: Number, default: 0 },
  color: { type: String, default: 'purple' },
  deadline: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Goal', goalSchema);