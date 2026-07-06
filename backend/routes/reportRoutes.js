const express = require('express');
const router = express.Router();
const { getMonthlyReport, getCategoryReport } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/monthly',  protect, getMonthlyReport);
router.get('/category', protect, getCategoryReport);

module.exports = router;