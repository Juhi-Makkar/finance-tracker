const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Generate JWT token
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// In-memory OTP store (use Redis in production)
const otpStore = {};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Generate email verification token
const generateVerificationToken = () => crypto.randomBytes(32).toString('hex');

// Nodemailer transporter setup
const getMailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email service is not configured");
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
};
// Send email verification email
const sendVerificationEmail = async (email, verificationToken, firstName) => {
  const transporter = getMailTransporter();
  // This must be a live public URL in production. Keeping it explicit avoids
  // accidentally sending links to a stale ngrok tunnel.
  const backendBase = (process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
  const frontendBase = (process.env.FRONTEND_URL || `${backendBase}/pages`).replace(/\/$/, '');
  const verificationLink = `${frontendBase}/verify-email.html?token=${encodeURIComponent(verificationToken)}`;

  console.log("EMAIL_USER =", process.env.EMAIL_USER);
  console.log("Sending email to:", email);

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'FinTrack Email Verification',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Welcome to FinTrack, ${firstName}!</h2>
        <p>Please verify your email to activate your account and start tracking your finances.</p>
        <a href="${verificationLink}" style="background-color: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
          Verify Email Address
        </a>
        <p style="color: #666; margin-top: 30px;">Or copy this link: <br/><code>${verificationLink}</code></p>
        <p style="color: #999; font-size: 12px;">This link expires in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">© 2025 FinTrack. All rights reserved.</p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (email, otp) => {
  const transporter = getMailTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'FinTrack Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Password Reset Request</h2>
        <p>Your FinTrack password reset code is:</p>
        <h3 style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center; letter-spacing: 5px;">
          ${otp}
        </h3>
        <p style="color: #666;">This code expires in 10 minutes.</p>
        <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
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
    
    // Generate verification token
    const emailVerificationToken = generateVerificationToken();
    const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      currency,
      emailVerificationToken,
      emailVerificationExpiry,
      isEmailVerified: false,
    });
    
    // Send verification email
    try {
      await sendVerificationEmail(email, emailVerificationToken, firstName);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return res.status(500).json({ message: 'Failed to send verification email. Check email configuration.' });
    }
    
    res.status(201).json({
  message: 'Account created successfully!',
  user: {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email
  }
});
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// @route POST /api/auth/verify-email
const verifyEmail = async (req, res) => {
  try {
    const token = req.method === 'GET' ? req.query.token : req.body.token;
    
    if (!token)
      return req.method === 'GET'
        ? res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email.html?status=failed`)
        : res.status(400).json({ message: 'Verification token is required.' });
    
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpiry: { $gt: Date.now() },
    });
    
    if (!user) {
      return req.method === 'GET'
        ? res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email.html?status=failed`)
        : res.status(400).json({ message: 'Invalid or expired verification token.' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiry = null;
    await user.save();

    if (req.method === 'GET') {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login.html?verified=true`);
    }

    res.json({
      message: 'Email verified successfully! You can now login.',
      isEmailVerified: true,
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// @route POST /api/auth/resend-verification
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email)
      return res.status(400).json({ message: 'Email is required.' });
    
    const user = await User.findOne({ email });
    
    if (!user)
      return res.status(404).json({ message: 'No account found with this email.' });
    
    if (user.isEmailVerified)
      return res.status(400).json({ message: 'Email is already verified.' });
    
    // Generate new verification token
    const emailVerificationToken = generateVerificationToken();
    const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpiry = emailVerificationExpiry;
    await user.save();
    /*
    try {
      await sendVerificationEmail(email, emailVerificationToken, user.firstName);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return res.status(500).json({ message: 'Failed to send verification email.' });
    }*/
    
    res.json({ message: 'Verification email sent! Check your inbox.' });
  } catch (error) {
    console.error('Resend verification error:', error);
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
    
    // Check if email is verified
/*    if (!user.isEmailVerified)
      return res.status(403).json({ 
        message: 'Please verify your email first.',
        requiresVerification: true,
        email: user.email,
      });
    */
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
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        currency: user.currency,
        theme: user.theme,
        isAdmin: user.isAdmin,
        isEmailVerified: user.isEmailVerified,
      }
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

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    // req.user comes only from the verified JWT in `protect`; never trust an
    // email or user id supplied by the browser for this operation.
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'This account is blocked.' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    if (await user.matchPassword(newPassword)) {
      return res.status(400).json({ message: 'Your new password must be different from your current password.' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully!' });
  } catch (error) {
    console.error('Change password error:', error);
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

module.exports = { register, login, getMe, updateMe, changePassword, verifyEmail, resendVerificationEmail, forgotPassword, verifyOtp, resetPassword };
