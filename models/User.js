const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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
      trim: true
    },
    profilePhotoUrl: {
      type: String,
      default: ''
    },
    theme: {
      type: String,
      enum: ['dark', 'light'],
      default: 'dark'
    },
    weeklyGoal: {
      type: Number,
      default: 4
    },
    remindersEnabled: {
      type: Boolean,
      default: false
    },
    reminderTime: {
      type: String,
      default: '09:00'
    }
  },
  {
    timestamps: true
  }
);

const SALT_ROUNDS = 10;

userSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) return next();
    if (!this.password) return next(new Error('Password is required'));

    const hash = await bcrypt.hash(this.password, SALT_ROUNDS);
    this.password = hash;
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.pre('findOneAndUpdate', async function (next) {
  try {
    const update = this.getUpdate();
    if (!update) return next();

    if (update.password) {
      const hash = await bcrypt.hash(update.password, SALT_ROUNDS);
      update.password = hash;
      this.setUpdate(update);
    }

    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (plainPassword) {
  if (!plainPassword || !this.password) {
    return false;
  }
  return bcrypt.compare(plainPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;