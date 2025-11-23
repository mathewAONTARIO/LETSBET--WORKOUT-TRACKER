const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema({
  workoutName: { type: String },
  exercise: { type: String, required: true },
  category: { type: String, default: 'Other' },
  sets: { type: Number, required: true },
  reps: { type: Number, required: true },
  weight: { type: Number },
  date: { type: Date, default: Date.now },
  notes: { type: String }
});

module.exports = mongoose.model('Workout', workoutSchema);