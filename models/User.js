const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },

  weeklyGoal: {
    type: Number,
    default: 4, 
    min: 1,
    max: 14
  },

  theme: {
    type: String,
    enum: ['dark', 'light'],
    default: 'dark'
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);