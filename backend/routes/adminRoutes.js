const express = require('express');
const router = express.Router();
const { getStats, getUsers, getUserDetails, toggleBlockUser, deleteUser, getAllTransactions, getGrowth, makeAdmin } = require('../controllers/adminController');
const { adminProtect } = require('../middleware/adminMiddleware');

router.get('/stats',              adminProtect, getStats);
router.get('/users',              adminProtect, getUsers);
router.get('/users/:id',          adminProtect, getUserDetails);
router.put('/users/:id/block',    adminProtect, toggleBlockUser);
router.put('/users/:id/admin',    adminProtect, makeAdmin);
router.delete('/users/:id',       adminProtect, deleteUser);
router.get('/transactions',       adminProtect, getAllTransactions);
router.get('/growth',             adminProtect, getGrowth);

module.exports = router;