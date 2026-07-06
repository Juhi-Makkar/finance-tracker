const RecurringTransaction = require('../models/RecurringTransaction');

const getRecurring = async (req, res) => {
  try {
    const items = await RecurringTransaction.find({ user: req.user.id }).sort({ day: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

const addRecurring = async (req, res) => {
  try {
    const { name, type, amount, category, day, emoji, active = true } = req.body;
    if (!name || !type || !amount || !category || !day) {
      return res.status(400).json({ message: 'Please fill all required fields.' });
    }
    const item = await RecurringTransaction.create({
      user: req.user.id,
      name,
      type,
      amount,
      category,
      day,
      emoji: emoji || '💰',
      active,
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

const updateRecurring = async (req, res) => {
  try {
    const item = await RecurringTransaction.findOne({ _id: req.params.id, user: req.user.id });
    if (!item) return res.status(404).json({ message: 'Recurring transaction not found.' });

    const { name, type, amount, category, day, emoji, active } = req.body;
    if (name !== undefined) item.name = name;
    if (type !== undefined) item.type = type;
    if (amount !== undefined) item.amount = amount;
    if (category !== undefined) item.category = category;
    if (day !== undefined) item.day = day;
    if (emoji !== undefined) item.emoji = emoji;
    if (active !== undefined) item.active = active;

    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

const deleteRecurring = async (req, res) => {
  try {
    const item = await RecurringTransaction.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!item) return res.status(404).json({ message: 'Recurring transaction not found.' });
    res.json({ message: 'Recurring transaction deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  getRecurring,
  addRecurring,
  updateRecurring,
  deleteRecurring,
};


// hyyy