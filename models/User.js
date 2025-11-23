// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    default: ''
  },
  profilePhotoUrl: {
    type: String,
    default: ''
  },
  weeklyGoal: {
    type: Number,
    default: 4
  },
  theme: {
    type: String,
    enum: ['dark', 'light'],
    default: 'dark'
  },
  reminderEnabled: {
    type: Boolean,
    default: false
  },
  reminderTime: {
    // stored as "HH:MM"
    type: String,
    default: '18:00'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// hash password before save if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const hash = await bcrypt.hash(this.password, 10);
    this.password = hash;
    next();
  } catch (err) {
    next(err);
  }
});

// used in login
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);