const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },

    // ✅ for fast search (q)
    nameLower: {
      type: String,
      required: true,
      index: true
    },

    category: {
      type: String,
      enum: [
        'Push',
        'Pull',
        'Legs',
        'Upper Body',
        'Lower Body',
        'Core',
        'Cardio',
        'Full Body',
        'Other'
      ],
      default: 'Other'
    },

    muscles: [{ type: String, trim: true }],

    instructions: [{ type: String, trim: true }],

    tips: [{ type: String, trim: true }],

    imageUrl: {
      type: String,
      default: null
      // stored local path like /img/exercises/bench-press-xxxx.jpg
    },

    videoUrl: {
      type: String,
      default: null
    },

    equipment: [{ type: String, trim: true }],

    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner'
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// ✅ auto-fill nameLower
exerciseSchema.pre('validate', function (next) {
  if (this.name) this.nameLower = this.name.toLowerCase().trim();
  next();
});

module.exports = mongoose.model('Exercise', exerciseSchema);