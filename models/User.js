// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  // Hashed password
  password: {
    type: String,
    required: true
  },

  // Basic profile
  displayName: {
    type: String,
    trim: true,
    default: ''
  },
  profilePhotoUrl: {
    type: String,
    default: ''
  },

  // Training + goals
  weeklyGoal: {
    type: Number,
    default: 4
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    default: 'prefer_not_to_say'
  },
  age: {
    type: Number
  },
  heightCm: {
    type: Number // stored in centimeters
  },
  weightKg: {
    type: Number // stored in kilograms
  },
  preferredWeightUnit: {
    type: String,
    enum: ['kg', 'lb'],
    default: 'kg'
  },
  primaryGoal: {
    type: String,
    enum: ['strength', 'muscle_gain', 'fat_loss', 'performance', 'general_fitness', 'other'],
    default: 'general_fitness'
  },
  trainingExperience: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },

  // Theme + reminders
  theme: {
    type: String,
    enum: ['dark', 'light'],
    default: 'dark'
  },
  reminderEnabled: {
    type: Boolean,
    default: false
  },
  // Stored as "HH:MM" (24h)
  reminderTime: {
    type: String,
    default: '18:00'
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving if it was modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(this.password, saltRounds);
    this.password = hash;
    next();
  } catch (err) {
    next(err);
  }
});

// Helper to compare password on login
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);