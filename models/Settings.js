// models/Settings.js
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    weeklyGoal: {
      type: Number,
      default: 0 // 0 = no goal set
    },
    reminderTime: {
      type: String, // "18:00" etc
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);