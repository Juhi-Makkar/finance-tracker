const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const Budget = require('../models/Budget');

// GET /api/admin/stats — Platform overview
const getStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers, activeToday, newThisMonth,
      totalTransactions, txThisMonth,
      incomeAgg, expenseAgg,
      totalGoals, totalBudgets
    ] = await Promise.all([
      User.countDocuments({ isAdmin: false }),
      User.countDocuments({ lastLogin: { $gte: startOfDay }, isAdmin: false }),
      User.countDocuments({ createdAt: { $gte: startOfMonth }, isAdmin: false }),
      Transaction.countDocuments(),
      Transaction.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Transaction.aggregate([{ $match: { type: 'income'  } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Transaction.aggregate([{ $match: { type: 'expense' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Goal.countDocuments(),
      Budget.countDocuments(),
    ]);

    res.json({
      totalUsers,
      activeToday,
      newThisMonth,
      totalTransactions,
      txThisMonth,
      totalIncome:  incomeAgg[0]?.total  || 0,
      totalExpense: expenseAgg[0]?.total || 0,
      totalGoals,
      totalBudgets,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/admin/users — All users
const getUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = { isAdmin: false };
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName:  { $regex: search, $options: 'i' } },
        { email:     { $regex: search, $options: 'i' } },
      ];
    }
    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip((page-1)*limit).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    // Add transaction count per user
    const usersWithStats = await Promise.all(users.map(async (u) => {
      const [txCount, income, expense] = await Promise.all([
        Transaction.countDocuments({ user: u._id }),
        Transaction.aggregate([{ $match: { user: u._id, type: 'income'  } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        Transaction.aggregate([{ $match: { user: u._id, type: 'expense' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      ]);
      return {
        ...u.toObject(),
        txCount,
        totalIncome:  income[0]?.total  || 0,
        totalExpense: expense[0]?.total || 0,
      };
    }));

    res.json({ users: usersWithStats, total, pages: Math.ceil(total/limit), page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/admin/users/:id — Single user details
const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const [transactions, goals, budgets] = await Promise.all([
      Transaction.find({ user: req.params.id }).sort({ date: -1 }).limit(20),
      Goal.find({ user: req.params.id }),
      Budget.find({ user: req.params.id }),
    ]);
    res.json({ user, transactions, goals, budgets });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// PUT /api/admin/users/:id/block — Block/unblock user
const toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.isAdmin) return res.status(403).json({ message: 'Cannot block admin.' });
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully.`, isBlocked: user.isBlocked });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE /api/admin/users/:id — Delete user & all their data
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.isAdmin) return res.status(403).json({ message: 'Cannot delete admin.' });
    await Promise.all([
      Transaction.deleteMany({ user: req.params.id }),
      Goal.deleteMany({ user: req.params.id }),
      Budget.deleteMany({ user: req.params.id }),
      User.findByIdAndDelete(req.params.id),
    ]);
    res.json({ message: 'User and all data deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/admin/transactions — All transactions
const getAllTransactions = async (req, res) => {
  try {
    const { type, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    const [transactions, total] = await Promise.all([
      Transaction.find(filter).populate('user', 'firstName lastName email').sort({ date: -1 }).skip((page-1)*limit).limit(parseInt(limit)),
      Transaction.countDocuments(filter),
    ]);
    res.json({ transactions, total, pages: Math.ceil(total/limit) });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/admin/growth — Monthly user growth chart data
const getGrowth = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => i);
    const data = await Promise.all(months.map(async (m) => {
      const [users, transactions] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: new Date(year,m,1), $lte: new Date(year,m+1,0,23,59,59) }, isAdmin: false }),
        Transaction.countDocuments({ createdAt: { $gte: new Date(year,m,1), $lte: new Date(year,m+1,0,23,59,59) } }),
      ]);
      return { month: m+1, users, transactions };
    }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// POST /api/admin/make-admin — Make a user admin
const makeAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.isAdmin = true;
    await user.save();
    res.json({ message: `${user.firstName} is now an admin.` });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getStats, getUsers, getUserDetails, toggleBlockUser, deleteUser, getAllTransactions, getGrowth, makeAdmin };