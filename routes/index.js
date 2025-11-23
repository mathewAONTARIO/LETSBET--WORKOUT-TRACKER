const express = require('express');
const router = express.Router();
const Workout = require('../models/Workout');

// Home page – stats are per logged-in user
router.get('/', async (req, res) => {
  try {
    const currentUser = res.locals.currentUser;

    // If not logged in, just show a neutral dashboard
    if (!currentUser) {
      return res.render('index', {
        weeklyWorkouts: 0,
        weeklyVolume: 0,
        bestDay: null,
        weeklyGoal: 4,
        weeklyProgressPercent: 0,
        workoutOfDay: null
      });
    }

    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 6);

    // 🔥 Only pull workouts that belong to THIS user
    const weeklyWorkoutsDocs = await Workout.find({
      user: currentUser._id,
      date: { $gte: weekAgo }
    }).sort({ date: -1 });

    const weeklyWorkouts = weeklyWorkoutsDocs.length;

    const weeklyVolume = weeklyWorkoutsDocs.reduce((sum, w) => {
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

    const weeklyGoal = currentUser.weeklyGoal || 4;
    const weeklyProgressPercent = Math.min(
      (weeklyWorkouts / weeklyGoal) * 100,
      100
    );

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