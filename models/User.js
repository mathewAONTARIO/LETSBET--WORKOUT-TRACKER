const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

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

    emailVerificationSentAt: { type: Date },
    emailVerificationSendCount: { type: Number, default: 0 },

    resetPasswordTokenHash: { type: String, default: '' },
    resetPasswordExpires: { type: Date }
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (e) {
    return next(e);
  }
});

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(String(candidate || ''), this.password);
};

UserSchema.methods.makeTokenPair = function () {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
};

module.exports = mongoose.model('User', UserSchema);