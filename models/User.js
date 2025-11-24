const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Only store the hash
    passwordHash: {
      type: String,
      required: true,
    },

    displayName: { type: String, trim: true },

    // Original fields
    weeklyGoal: { type: Number, default: 4 },
    theme: {
      type: String,
      enum: ['dark', 'light'],
      default: 'dark',
    },
    profilePhotoUrl: { type: String },

    // Profile details
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not'],
      default: 'prefer-not',
    },
    age: { type: Number, min: 0, max: 120 },

    heightCm: { type: Number, min: 0 },
    heightUnit: {
      type: String,
      enum: ['cm', 'ft'],
      default: 'cm',
    },

    weight: { type: Number, min: 0 },
    weightUnit: {
      type: String,
      enum: ['kg', 'lb'],
      default: 'kg',
    },

    primaryGoal: {
      type: String,
      default: 'general_fitness',
    },

    trainingExperience: {
      type: String,
      default: 'beginner',
    },

    reminderEnabled: { type: Boolean, default: false },
    reminderTime: { type: String, default: '18:00' }, // "HH:MM" 24h
  },
  { timestamps: true }
);

// Virtual password setter – whenever you assign user.password,
// it hashes it into passwordHash.
userSchema
  .virtual('password')
  .set(function (plainPassword) {
    this._password = plainPassword;
    if (plainPassword && plainPassword.length > 0) {
      this.passwordHash = bcrypt.hashSync(plainPassword, 10);
    }
  });

// Compare a plain password to the stored hash
userSchema.methods.comparePassword = async function (candidate) {
  if (!candidate || !this.passwordHash) return false;
  return bcrypt.compare(candidate, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);