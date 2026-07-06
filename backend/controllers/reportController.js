const Transaction = require('../models/Transaction');

const getMonthlyReport = async (req, res) => {
  try {
    const { year } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => i);
    const report = await Promise.all(months.map(async (m) => {
      const start = new Date(y, m, 1);
      const end   = new Date(y, m + 1, 0, 23, 59, 59);
      const filter = { user: req.user.id, date: { $gte: start, $lte: end } };
      const [income, expense] = await Promise.all([
        Transaction.aggregate([{ $match: { ...filter, type: 'income'  } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        Transaction.aggregate([{ $match: { ...filter, type: 'expense' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      ]);
      const inc = income[0]?.total  || 0;
      const exp = expense[0]?.total || 0;
      return { month: m + 1, income: inc, expense: exp, savings: inc - exp };
    }));
    res.json(report);
  } catch (err) { res.status(500).json({ message: 'Server error.' }); }
};

const getCategoryReport = async (req, res) => {
  try {
    const { month, year, type = 'expense' } = req.query;
    const now = new Date();
    const m = parseInt(month) || now.getMonth() + 1;
    const y = parseInt(year)  || now.getFullYear();
    const report = await Transaction.aggregate([
      { $match: { user: req.user.id, type, date: { $gte: new Date(y, m-1, 1), $lte: new Date(y, m, 0, 23, 59, 59) } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    res.json(report);
  } catch (err) { res.status(500).json({ message: 'Server error.' }); }
};

module.exports = { getMonthlyReport, getCategoryReport };