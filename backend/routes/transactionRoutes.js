const express = require('express');
const router = express.Router();
const { getTransactions, addTransaction, updateTransaction, deleteTransaction, getSummary, getDashboardAnalytics } = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

// IMPORTANT: /summary must be BEFORE /:id otherwise Express treats "summary" as an id
router.get('/summary',   protect, getSummary);
router.get('/dashboard', protect, getDashboardAnalytics);
router.get('/',          protect, getTransactions);
router.post('/',         protect, addTransaction);
router.put('/:id',       protect, updateTransaction);
router.delete('/:id',    protect, deleteTransaction);

module.exports = router;
