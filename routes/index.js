// routes/index.js
const express = require('express');
const router = express.Router();

const Workout = require('../models/Workout');
const Meal = require('../models/Meal'); // make sure this file exists

router.get('/', async (req, res) => {
  const currentUser = res.locals.currentUser;
  const isLoggedIn = !!currentUser;

  // default props so the page never crashes
  const baseProps = {
    currentPath: '/',
    isLoggedIn,
    todayWorkoutCount: 0,
    todayVolume: 0,
    todayCalories: 0,
    weeklyWorkouts: 0,
    weeklyGoal: isLoggedIn ? (currentUser.weeklyGoal || 4) : 4,
    weeklyProgressPercent: 0,
    workoutOfDay: null
  };

  // not logged in → simple landing dashboard
  if (!isLoggedIn) {
    return res.render('home', baseProps);
  }

  try {
    // ----- date helpers -----
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6); // last 7 days including today

    // ----- today’s workouts -----
    const todayWorkouts = await Workout.find({
      user: currentUser._id,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ date: -1 });

    const todayWorkoutCount = todayWorkouts.length;

    const todayVolume = todayWorkouts.reduce((sum, w) => {
      const sets = w.sets || 0;
      const reps = w.reps || 0;
      const weight = w.weight || 0;
      return sum + sets * reps * weight;
    }, 0);

    // ----- today’s meals -----
    const todayMeals = await Meal.find({
      user: currentUser._id,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ date: -1 });

    const todayCalories = todayMeals.reduce(
      (sum, m) => sum + (m.calories || 0),
      0
    );

    // ----- weekly workouts (for goal bar) -----
    const weeklyWorkoutsDocs = await Workout.find({
      user: currentUser._id,
      date: { $gte: weekStart }
    }).sort({ date: 1 });

    const weeklyWorkouts = weeklyWorkoutsDocs.length;
    const weeklyGoal = currentUser.weeklyGoal || 4;
    const weeklyProgressPercent = Math.min(
      Math.round((weeklyWorkouts / weeklyGoal) * 100),
      100
    );

    // pick a “highlight” workout
    const workoutOfDay =
      todayWorkouts[0] ||
      (weeklyWorkoutsDocs.length > 0
        ? weeklyWorkoutsDocs[weeklyWorkoutsDocs.length - 1]
        : null);

    return res.render('home', {
      ...baseProps,
      todayWorkoutCount,
      todayVolume,
      todayCalories,
      weeklyWorkouts,
      weeklyGoal,
      weeklyProgressPercent,
      workoutOfDay
    });
  } catch (err) {
    console.error('Home route error:', err);
    return res.render('home', baseProps);
  }
});

module.exports = router;