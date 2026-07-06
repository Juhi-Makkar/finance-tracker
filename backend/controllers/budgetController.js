const Budget = require('../models/Budget');

const getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user.id }).sort({ createdAt: 1 });
    res.json(budgets);
  } catch (err) {
    console.error('getBudgets error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

const addBudget = async (req, res) => {
  try {
    const { category, limit, icon } = req.body;
    if (!category || !limit)
      return res.status(400).json({ message: 'Category and limit required.' });

    const exists = await Budget.findOne({ user: req.user.id, category });
    if (exists)
      return res.status(400).json({ message: 'Budget for this category already exists.' });

    const budget = await Budget.create({ user: req.user.id, category, limit, icon, spent: 0 });
    res.status(201).json(budget);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

const updateBudget = async (req, res) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, user: req.user.id });
    if (!budget)
      return res.status(404).json({ message: 'Budget not found.' });
    Object.assign(budget, req.body);
    await budget.save();
    res.json(budget);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!budget)
      return res.status(404).json({ message: 'Budget not found.' });
    res.json({ message: 'Budget deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getBudgets, addBudget, updateBudget, deleteBudget };



// const CATEGORY_MAP = {
//   'Food':          ['Food', 'Restaurant', 'Snacks'],
//   'Grocery':       ['Grocery'],
//   'Transport':     ['Transport', 'Bike Petrol', 'Bike Servicing', 'Public Transport', 'Travel'],
//   'Shopping':      ['Shopping', 'Clothing'],
//   'Entertainment': ['Entertainment', 'YouTube Expenses', 'Netflix', 'Spotify', 'Subscriptions'],
//   'Health':        ['Health', 'Medicines', 'Gym', 'Doctor'],
//   'Education':     ['Education', 'Books', 'Courses'],
//   'Rent':          ['Rent'],
//   'Electricity':   ['Electricity'],
//   'Water':         ['Water'],
//   'Internet':      ['Internet'],
//   'Subscriptions': ['Subscriptions', 'Netflix', 'Spotify', 'YouTube Expenses'],
//   'Beauty':        ['Beauty'],
//   'Others':        ['Others', 'Miscellaneous'],
// };