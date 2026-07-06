const Goal = require('../models/Goal');

const getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (err) { res.status(500).json({ message: 'Server error.' }); }
};

const addGoal = async (req, res) => {
  try {
    const { name, emoji, target, saved, color, deadline } = req.body;
    if (!name || !target) return res.status(400).json({ message: 'Name and target required.' });
    const goal = await Goal.create({ user: req.user.id, name, emoji, target, saved: saved||0, color, deadline });
    res.status(201).json(goal);
  } catch (err) { res.status(500).json({ message: 'Server error.' }); }
};

const updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user.id });
    if (!goal) return res.status(404).json({ message: 'Goal not found.' });
    Object.assign(goal, req.body);
    await goal.save();
    res.json(goal);
  } catch (err) { res.status(500).json({ message: 'Server error.' }); }
};

const addSavings = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user.id });
    if (!goal) return res.status(404).json({ message: 'Goal not found.' });
    goal.saved = Math.min(goal.saved + req.body.amount, goal.target);
    await goal.save();
    res.json(goal);
  } catch (err) { res.status(500).json({ message: 'Server error.' }); }
};

const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!goal) return res.status(404).json({ message: 'Goal not found.' });
    res.json({ message: 'Goal deleted.' });
  } catch (err) { res.status(500).json({ message: 'Server error.' }); }
};

module.exports = { getGoals, addGoal, updateGoal, addSavings, deleteGoal };