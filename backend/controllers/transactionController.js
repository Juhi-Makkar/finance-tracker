const Transaction = require('../models/Transaction');

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
    const { type, amount, date, category, description } = req.body;
    if (!type || !amount || !date || !category) {
      return res.status(400).json({ message: 'Please fill all required fields.' });
    }
    const tx = await Transaction.create({
      user: req.user.id, type, amount, date, category, description
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
    const { type, amount, date, category, description } = req.body;
    tx.type = type || tx.type;
    tx.amount = amount || tx.amount;
    tx.date = date || tx.date;
    tx.category = category || tx.category;
    tx.description = description ?? tx.description;
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

module.exports = { getTransactions, addTransaction, updateTransaction, deleteTransaction, getSummary };