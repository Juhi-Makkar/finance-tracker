const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Generate JWT token
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// In-memory OTP store (use Redis in production)
const otpStore = {};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendPasswordResetEmail = async (email, otp) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)
    throw new Error('Email service is not configured');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'FinTrack Password Reset OTP',
    text: `Your FinTrack password reset code is ${otp}. It expires in 10 minutes.`,
  });
};

// @route POST /api/auth/register
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, currency } = req.body;
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: 'Please fill all required fields.' });
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: 'Email already registered. Please login.' });
    const user = await User.create({ firstName, lastName, email, phone, password, currency });
    res.status(201).json({
      message: 'Account created successfully!',
      token: generateToken(user._id),
      user: { id:user._id, firstName:user.firstName, lastName:user.lastName, email:user.email, currency:user.currency, theme:user.theme, isAdmin:user.isAdmin }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// @route POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Please enter email and password.' });
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: 'Invalid email or password.' });
    if (user.isBlocked)
      return res.status(403).json({ message: 'Your account has been blocked. Contact support.' });
    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid email or password.' });
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    res.json({
      message: 'Login successful!',
      token: generateToken(user._id),
      user: { id:user._id, firstName:user.firstName, lastName:user.lastName, email:user.email, currency:user.currency, theme:user.theme, isAdmin:user.isAdmin }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// @route GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// @route PUT /api/auth/me
const updateMe = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, currency } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (email && email !== user.email) {
      const emailTaken = await User.findOne({ email });
      if (emailTaken) return res.status(400).json({ message: 'Email already in use.' });
    }
    user.firstName = firstName ?? user.firstName;
    user.lastName = lastName ?? user.lastName;
    user.email = email ?? user.email;
    user.phone = phone ?? user.phone;
    user.currency = currency ?? user.currency;
    await user.save();
    res.json({
      message: 'Profile updated successfully!',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        currency: user.currency,
        theme: user.theme,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// @route PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch)
      return res.status(401).json({ message: 'Current password is incorrect.' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// @route POST /api/auth/forgot-password
// Sends a password reset OTP via email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: 'No account found with this email.' });

    const otp = generateOtp();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore[email] = { otp, expiry, verified: false };
    await sendPasswordResetEmail(email, otp);

    res.json({ message: 'OTP sent to your email!' });
  } catch (error) {
    console.error('Forgot password error:', error);
    if (error.message && error.message.includes('Email service is not configured')) {
      return res.status(500).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to send email. Check your EMAIL_USER and EMAIL_PASS in .env' });
  }
};

// @route POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const stored = otpStore[email];
    if (!stored) return res.status(400).json({ message: 'OTP not found. Request a new one.' });
    if (Date.now() > stored.expiry) { delete otpStore[email]; return res.status(400).json({ message: 'OTP expired. Request a new one.' }); }
    if (stored.otp !== otp) return res.status(400).json({ message: 'Invalid OTP.' });
    // Mark as verified
    otpStore[email].verified = true;
    res.json({ message: 'OTP verified!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// @route POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const stored = otpStore[email];
    if (!stored || !stored.verified)
      return res.status(400).json({ message: 'Please verify OTP first.' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.password = newPassword;
    await user.save();
    delete otpStore[email];
    res.json({ message: 'Password reset successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { register, login, getMe, updateMe, changePassword, forgotPassword, verifyOtp, resetPassword };