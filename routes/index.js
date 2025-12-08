// routes/index.js
const express = require('express');
const router = express.Router();
const Workout = require('../models/Workout');
const Meal = require('../models/Meal');

router.get('/', async (req, res) => {
  try {
    const currentUser = res.locals.currentUser;

    // Not logged in → simple marketing-style home
    if (!currentUser) {
      return res.render('home', {
        currentPath: '/',
        isLoggedIn: false,
        todayWorkoutCount: 0,
        todayVolume: 0,
        todayCalories: 0,
        weeklyWorkouts: 0,
        weeklyGoal: null
      });
    }

    // ----- Date ranges -----
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6); // last 7 days incl. today

    // ----- Fetch workouts + meals -----
    const [todayWorkouts, todayMeals, weekWorkouts] = await Promise.all([
      Workout.find({
        user: currentUser._id,
        date: { $gte: today, $lt: tomorrow }
      }),
      Meal.find({
        user: currentUser._id,
        date: { $gte: today, $lt: tomorrow }
      }),
      Workout.find({
        user: currentUser._id,
        date: { $gte: weekStart, $lt: tomorrow }
      })
    ]);

    // ----- Today stats -----
    const todayWorkoutCount = todayWorkouts.length;

    const todayVolume = todayWorkouts.reduce((sum, w) => {
      const sets = w.sets || 0;
      const reps = w.reps || 0;
      const weight = w.weight || 0;
      return sum + sets * reps * weight;
    }, 0);

    const todayCalories = todayMeals.reduce(
      (sum, m) => sum + (m.calories || 0),
      0
    );

    // ----- Weekly goal progress -----
    const weeklyWorkouts = weekWorkouts.length;
    const weeklyGoal = currentUser.weeklyGoal || 4;

    return res.render('home', {
      currentPath: '/',
      isLoggedIn: true,
      todayWorkoutCount,
      todayVolume,
      todayCalories,
      weeklyWorkouts,
      weeklyGoal
    });
  } catch (err) {
    console.error('Home route error:', err);

    return res.render('home', {
      currentPath: '/',
      isLoggedIn: !!res.locals.currentUser,
      todayWorkoutCount: 0,
      todayVolume: 0,
      todayCalories: 0,
      weeklyWorkouts: 0,
      weeklyGoal: res.locals.currentUser
        ? res.locals.currentUser.weeklyGoal || 4
        : null
    });
  }
});

module.exports = router;