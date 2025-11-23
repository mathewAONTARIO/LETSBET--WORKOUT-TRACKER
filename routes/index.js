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

    const weeklyWorkouts = weeklyWorkoutsDocs.length;

    const weeklyVolume = weeklyWorkoutsDocs.reduce((sum, w) => {
      const sets = w.sets || 0;
      const reps = w.reps || 0;
      const weight = w.weight || 0;
      return sum + sets * reps * weight;
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

    const weeklyGoal = 4; 
    const weeklyProgressPercent =
      weeklyWorkouts === 0
        ? 0
        : Math.min((weeklyWorkouts / weeklyGoal) * 100, 100);

    const workoutOfDay = weeklyWorkoutsDocs[0] || null;

    res.render('index', {
      weeklyWorkouts,
      weeklyVolume,
      bestDay,
      weeklyGoal,
      weeklyProgressPercent,
      workoutOfDay
    });

  } catch (err) {
    console.error(err);
    res.render('index', {
      weeklyWorkouts: 0,
      weeklyVolume: 0,
      bestDay: null,
      weeklyGoal: 4,
      weeklyProgressPercent: 0,
      workoutOfDay: null
    });
  }
});

module.exports = router;