const Transaction = require('../models/Transaction');

const PERIODS = ['monthly', 'quarterly', 'half-yearly', 'yearly'];
const PAYMENT_METHODS = ['UPI', 'Cash', 'Bank Transfer', 'Debit Card', 'Credit Card', 'Other'];

function isValidPaymentMethod(paymentMethod) {
  return paymentMethod === undefined || paymentMethod === null || paymentMethod === '' || PAYMENT_METHODS.includes(paymentMethod);
}

function getCurrentPeriod(period, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  let start;

  if (period === 'quarterly') start = new Date(year, Math.floor(month / 3) * 3, 1);
  else if (period === 'half-yearly') start = new Date(year, month < 6 ? 0 : 6, 1);
  else if (period === 'yearly') start = new Date(year, 0, 1);
  else start = new Date(year, month, 1);

  return { start, end: now };
}

function getTrendBuckets(period, start, end) {
  if (period === 'monthly') {
    const buckets = [];
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      buckets.push({ key: date.toISOString().slice(0, 10), label: String(date.getDate()) });
    }
    return { format: '%Y-%m-%d', buckets };
  }

  const buckets = [];
  for (let date = new Date(start); date <= end; date.setMonth(date.getMonth() + 1)) {
    buckets.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('en-IN', { month: 'short' }),
    });
  }
  return { format: '%Y-%m', buckets };
}

// GET all transactions for logged in user
const getTransactions = async (req, res) => {
  try {
    const { type, month, year, category, limit = 100 } = req.query;
    const filter = { user: req.user.id };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end   = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    } else if (year) {
      filter.date = { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59) };
    }
    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .limit(parseInt(limit));
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// POST add transaction
const addTransaction = async (req, res) => {
  try {
    const { type, amount, date, category, description, paymentMethod } = req.body;
    if (!type || !amount || !date || !category) {
      return res.status(400).json({ message: 'Please fill all required fields.' });
    }
    if (!isValidPaymentMethod(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method.' });
    }
    const tx = await Transaction.create({
      user: req.user.id, type, amount, date, category, description,
      paymentMethod: paymentMethod || null,
    });
    res.status(201).json(tx);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// PUT update transaction
const updateTransaction = async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, user: req.user.id });
    if (!tx) return res.status(404).json({ message: 'Transaction not found.' });
    const { type, amount, date, category, description, paymentMethod } = req.body;
    if (!isValidPaymentMethod(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method.' });
    }
    tx.type = type || tx.type;
    tx.amount = amount || tx.amount;
    tx.date = date || tx.date;
    tx.category = category || tx.category;
    tx.description = description ?? tx.description;
    if (paymentMethod !== undefined) tx.paymentMethod = paymentMethod || null;
    await tx.save();
    res.json(tx);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE transaction
const deleteTransaction = async (req, res) => {
  try {
    const tx = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!tx) return res.status(404).json({ message: 'Transaction not found.' });
    res.json({ message: 'Transaction deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET summary stats
const getSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = { user: req.user.id };
    if (month && year) {
      filter.date = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59)
      };
    }
    const [income, expense] = await Promise.all([
      Transaction.aggregate([{ $match: { ...filter, type: 'income' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Transaction.aggregate([{ $match: { ...filter, type: 'expense' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);
    const totalIncome  = income[0]?.total  || 0;
    const totalExpense = expense[0]?.total || 0;
    res.json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      savings: totalIncome - totalExpense
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET dashboard analytics for the current selected period. This aggregates in
// MongoDB, so dashboard totals never depend on a browser-side record limit.
const getDashboardAnalytics = async (req, res) => {
  try {
    const period = PERIODS.includes(req.query.period) ? req.query.period : 'monthly';
    const { start, end } = getCurrentPeriod(period);
    const match = { user: req.user._id, date: { $gte: start, $lte: end } };
    const trend = getTrendBuckets(period, start, end);

    const [totals, expensesByCategory, trendRows, recentTransactions] = await Promise.all([
      Transaction.aggregate([
        { $match: match },
        { $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        } },
      ]),
      Transaction.aggregate([
        { $match: { ...match, type: 'expense' } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ]),
      Transaction.aggregate([
        { $match: match },
        { $group: {
          _id: { bucket: { $dateToString: { format: trend.format, date: '$date' } }, type: '$type' },
          total: { $sum: '$amount' },
        } },
      ]),
      Transaction.find(match).sort({ date: -1 }).limit(6).lean(),
    ]);

    const totalIncome = totals.find(item => item._id === 'income')?.total || 0;
    const totalExpenses = totals.find(item => item._id === 'expense')?.total || 0;
    const trendByBucket = new Map();
    trendRows.forEach(({ _id, total }) => {
      const current = trendByBucket.get(_id.bucket) || { income: 0, expenses: 0 };
      current[_id.type === 'income' ? 'income' : 'expenses'] = total;
      trendByBucket.set(_id.bucket, current);
    });

    res.json({
      period,
      range: { start, end },
      remainingBalance: totalIncome - totalExpenses,
      totalIncome,
      totalExpenses,
      expenseRatio: totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : null,
      trend: trend.buckets.map(bucket => ({
        label: bucket.label,
        income: trendByBucket.get(bucket.key)?.income || 0,
        expenses: trendByBucket.get(bucket.key)?.expenses || 0,
      })),
      expensesByCategory: expensesByCategory.map(item => ({ category: item._id, total: item.total })),
      recentTransactions,
    });
  } catch (err) {
    console.error('Dashboard analytics error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getTransactions, addTransaction, updateTransaction, deleteTransaction, getSummary, getDashboardAnalytics };
