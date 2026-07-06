const RecurringTransaction = require('../models/RecurringTransaction');
const Transaction = require('../models/Transaction');

const getCurrentMonthRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

const getRecurringTransactionsToRun = async (asOfDate = new Date()) => {
  const recurring = await RecurringTransaction.find({ active: true });
  return recurring.filter((item) => {
    const nextRun = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), item.day);
    if (nextRun > asOfDate) return false;
    if (item.lastExecuted) {
      const last = new Date(item.lastExecuted);
      return last.getFullYear() !== asOfDate.getFullYear() || last.getMonth() !== asOfDate.getMonth();
    }
    return true;
  });
};

const createTransactionsForRecurring = async (asOfDate = new Date()) => {
  const recurringItems = await getRecurringTransactionsToRun(asOfDate);
  const created = [];

  for (const item of recurringItems) {
    const txDate = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), item.day);
    const existing = await Transaction.findOne({
      user: item.user,
      recurringId: item._id,
      date: txDate,
      amount: item.amount,
      type: item.type,
      category: item.category,
    });

    if (existing) {
      continue;
    }

    const tx = await Transaction.create({
      user: item.user,
      type: item.type,
      amount: item.amount,
      date: txDate,
      category: item.category,
      description: `Recurring: ${item.name}`,
      isRecurring: true,
      recurringId: item._id,
    });

    item.lastExecuted = txDate;
    await item.save();
    created.push(tx);
  }

  return created;
};

module.exports = {
  getRecurringTransactionsToRun,
  createTransactionsForRecurring,
};