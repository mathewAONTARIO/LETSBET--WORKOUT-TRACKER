// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

// If you ever change how passwords are hashed, bump this number.
const PASSWORD_VERSION = 1;

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },

    // Dashboard / profile stuff
    weeklyGoal: {
      type: Number,
      default: 4
    },

    profilePhotoUrl: {
      type: String
    },

    gender: {
      type: String,
      enum: ['male', 'female', 'non-binary', 'prefer-not-to-say', 'other'],
      default: 'prefer-not-to-say'
    },

    age: {
      type: Number,
      min: 0,
      max: 130
    },

    // Height with unit (e.g. 180 + 'cm' OR 5.92 + 'ft')
    heightValue: {
      type: Number,
      min: 0
    },
    heightUnit: {
      type: String,
      enum: ['cm', 'ft'],
      default: 'cm'
    },

    // Weight with unit
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
      enum: [
        'general-fitness',
        'muscle-gain',
        'fat-loss',
        'performance',
        'strength',
        'endurance',
        'other'
      ],
      default: 'general-fitness'
    },

    trainingExperience: {
      type: String,
      enum: ['beginner-0-6', 'intermediate-6-24', 'advanced-24-plus'],
      default: 'beginner-0-6'
    },

    // Reminders
    dailyReminderEnabled: {
      type: Boolean,
      default: false
    },
    reminderTime: {
      type: String, // e.g. "18:00"
      default: '18:00'
    },

    // Theme
    theme: {
      type: String,
      enum: ['dark', 'light'],
      default: 'dark'
    },

    // For future migrations
    passwordVersion: {
      type: Number,
      default: PASSWORD_VERSION
    }
  },
  {
    timestamps: true
  }
);

// Hash password before save, but only if it was changed
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const hash = await bcrypt.hash(this.password, SALT_ROUNDS);
    this.password = hash;
    this.passwordVersion = PASSWORD_VERSION;
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Compare a candidate password to the stored one.
 * - If stored password looks like a bcrypt hash -> normal compare.
 * - If it DOESN'T look like bcrypt (old plain text), we:
 *   1) compare as plain text,
 *   2) if it matches, re-hash and save (one-time migration).
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;

  const pwd = this.password;

  const looksHashed =
    typeof pwd === 'string' &&
    (pwd.startsWith('$2a$') || pwd.startsWith('$2b$') || pwd.startsWith('$2y$'));

  if (looksHashed) {
    // Normal bcrypt compare
    return bcrypt.compare(candidatePassword, pwd);
  }

  // Fallback: old/plain password stored (not great, but we fix it)
  const isMatch = candidatePassword === pwd;
  if (!isMatch) return false;

  // Migrate this user to bcrypt on the fly
  try {
    const newHash = await bcrypt.hash(candidatePassword, SALT_ROUNDS);
    this.password = newHash;
    this.passwordVersion = PASSWORD_VERSION;
    await this.save();
  } catch (e) {
    console.error('Error migrating password for user', this._id, e);
  }

  return true;
};

const User = mongoose.model('User', userSchema);
module.exports = User;