const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema({
  exercise: String,
  category: String,
  sets: Number,
  reps: Number,
  weight: Number,
  date: Date,
  notes: String,
  isPR: Boolean,

  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

module.exports = mongoose.model('Workout', workoutSchema);