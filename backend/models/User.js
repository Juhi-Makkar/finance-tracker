const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName:                  { type: String, required: true, trim: true },
  lastName:                   { type: String, required: true, trim: true },
  email:                      { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:                      { type: String, default: '' },
  password:                   { type: String, required: true },
  currency:                   { type: String, default: 'INR' },
  avatar:                     { type: String, default: '' },
  theme:                      { type: String, default: 'glass' },
  darkMode:                   { type: Boolean, default: true },
  notifications:             { type: Boolean, default: true },
  reminderTime:               { type: String, default: '20:00' },
  isAdmin:                    { type: Boolean, default: false },
  isBlocked:                  { type: Boolean, default: false },
  lastLogin:                  { type: Date, default: null },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
