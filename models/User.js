const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    reminderTime: { type: String, default: '18:00' },

    emailVerified: { type: Boolean, default: false },
    emailVerifyTokenHash: { type: String, default: '' },
    emailVerifyTokenExpires: { type: Date },

    resetPasswordTokenHash: { type: String, default: '' },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) return next();

    const pwd = String(this.password || '');

    // If it's already a bcrypt hash, don't hash again (prevents breaking existing users)
    if (pwd.startsWith('$2a$') || pwd.startsWith('$2b$') || pwd.startsWith('$2y$')) {
      return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(pwd, salt);
    return next();
  } catch (e) {
    return next(e);
  }
});

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(String(candidate || ''), String(this.password || ''));
};

module.exports = mongoose.model('User', UserSchema);