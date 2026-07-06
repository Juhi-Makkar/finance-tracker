const mongoose = require('mongoose');

const recurringSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  day: { type: Number, required: true, min: 1, max: 28 },
  emoji: { type: String, default: '💰' },
  active: { type: Boolean, default: true },
  lastExecuted: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('RecurringTransaction', recurringSchema);