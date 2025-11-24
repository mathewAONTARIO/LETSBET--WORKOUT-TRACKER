const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    // This stores the **hashed** password
    password: {
      type: String,
      required: true
    },
    displayName: {
      type: String,
      trim: true
    },

    // Weekly workout goal (used on dashboard/settings)
    weeklyGoal: {
      type: Number,
      default: 4,
      min: 1,
      max: 21
    },

    // Profile details
    gender: {
      type: String,
      enum: ['male', 'female', 'non-binary', 'prefer-not', ''],
      default: ''
    },
    age: {
      type: Number,
      min: 0,
      max: 120
    },

    // Height with unit toggle (cm / ft)
    heightValue: {
      type: Number,
      min: 0
    },
    heightUnit: {
      type: String,
      enum: ['cm', 'ft'],
      default: 'cm'
    },

    // Weight with unit toggle (kg / lb)
    weightValue: {
      type: Number,
      min: 0
    },
    weightUnit: {
      type: String,
      enum: ['kg', 'lb'],
      default: 'kg'
    },

    primaryGoal: {
      type: String,
      trim: true
    },

    trainingExperience: {
      type: String,
      trim: true
    },

    // Simple reminder preferences (no real notifications yet)
    reminderEnabled: {
      type: Boolean,
      default: false
    },
    reminderTime: {
      type: String, // "18:00" etc
      default: '18:00'
    },

    // Optional avatar URL if you decide to hook up uploads later
    avatarUrl: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Check a plain-text password against the stored hash
userSchema.methods.checkPassword = async function (candidatePassword) {
  try {
    if (!candidatePassword || !this.password) {
      return false;
    }
    const match = await bcrypt.compare(candidatePassword, this.password);
    return match;
  } catch (err) {
    console.error('checkPassword error:', err);
    return false;
  }
};

const User = mongoose.model('User', userSchema);
module.exports = User;