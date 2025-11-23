const express = require('express');
const router = express.Router();
const Workout = require('../models/Workout');

router.get('/', async (req, res) => {
  try {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 6);

    const weeklyWorkoutsDocs = await Workout.find({
      date: { $gte: weekAgo }
    }).sort({ date: -1 });

    const totalWorkouts = weeklyWorkoutsDocs.length;

    const totalVolume = weeklyWorkoutsDocs.reduce((sum, w) => {
      const weight = w.weight || 1;
      return sum + w.sets * w.reps * weight;
    }, 0);

    const countByDay = {};
    weeklyWorkoutsDocs.forEach(w => {
      const day = w.date.toLocaleDateString('en-US', { weekday: 'short' });
      countByDay[day] = (countByDay[day] || 0) + 1;
    });

    let bestDay = null;
    let bestCount = 0;
    Object.keys(countByDay).forEach(day => {
      if (countByDay[day] > bestCount) {
        bestDay = day;
        bestCount = countByDay[day];
      }
    });

    const workoutOfDay = weeklyWorkoutsDocs[0] || null;

    const profileName = 'Mathew';
    const weeklyGoal = 4;
    const weeklyProgress = totalWorkouts;
    const goalPercent = Math.min(
      100,
      Math.round((weeklyProgress / weeklyGoal) * 100) || 0
    );

    res.render('index', {
      profileName,
      weeklyWorkouts: totalWorkouts,
      weeklyVolume: totalVolume,
      bestDay,
      workoutOfDay,
      weeklyGoal,
      weeklyProgress,
      goalPercent
    });
  } catch (err) {
    console.error(err);
    res.render('index', {
      profileName: 'Mathew',
      weeklyWorkouts: 0,
      weeklyVolume: 0,
      bestDay: null,
      workoutOfDay: null,
      weeklyGoal: 4,
      weeklyProgress: 0,
      goalPercent: 0
    });
  }
});

router.get('/settings', (req, res) => {
  res.render('settings');
});

module.exports = router;