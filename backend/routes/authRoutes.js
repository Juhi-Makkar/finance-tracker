const express = require('express');
const router = express.Router();
const { register, login, getMe, updateMe, changePassword, forgotPassword, verifyOtp, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register',       register);
router.post('/login',          login);
router.get('/me',              protect, getMe);
router.put('/me',              protect, updateMe);
router.put('/change-password', protect, changePassword);
router.post('/forgot-password',forgotPassword);
router.post('/verify-otp',     verifyOtp);
router.post('/reset-password', resetPassword);

module.exports = router;