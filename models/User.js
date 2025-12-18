const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
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

    displayName: { type: String, default: '' },
    profilePhotoUrl: { type: String, default: '' },

    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },

    weeklyGoal: { type: Number, default: 4 },

    gender: {
      type: String,
      enum: ['prefer-not-to-say', 'male', 'female', 'non-binary', 'other'],
      default: 'prefer-not-to-say'
    },
    age: { type: Number, min: 10, max: 100 },

    heightValue: { type: String, default: '' },
    heightUnit: { type: String, enum: ['cm', 'ft'], default: 'cm' },

    weightValue: { type: String, default: '' },
    weightUnit: { type: String, enum: ['kg', 'lb'], default: 'kg' },

    targetWeightValue: { type: String, default: '' },
    targetWeightUnit: { type: String, enum: ['kg', 'lb'], default: 'kg' },

    primaryGoal: {
      type: String,
      enum: [
        'general-fitness',
        'fat-loss',
        'muscle-gain',
        'strength',
        'performance',
        'endurance'
      ],
      default: 'general-fitness'
    },

    trainingExperience: {
      type: String,
      enum: ['beginner-0-6', 'intermediate-6-24', 'advanced-24-plus'],
      default: 'beginner-0-6'
    },

    dailyReminderEnabled: { type: Boolean, default: false },
    reminderTime: { type: String, default: '18:00' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);