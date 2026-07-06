const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getRecurring, addRecurring, updateRecurring, deleteRecurring } = require('../controllers/recurringController');

router.get('/',       protect, getRecurring);
router.post('/',      protect, addRecurring);
router.put('/:id',    protect, updateRecurring);
router.delete('/:id', protect, deleteRecurring);

module.exports = router;
