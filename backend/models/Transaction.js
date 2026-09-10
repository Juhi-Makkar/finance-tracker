const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
  category: { type: String, required: true },
  description: { type: String, default: '' },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'Cash', 'Bank Transfer', 'Debit Card', 'Credit Card', 'Other', null],
    default: null,
  },
  isRecurring: { type: Boolean, default: false },
  recurringId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringTransaction', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
