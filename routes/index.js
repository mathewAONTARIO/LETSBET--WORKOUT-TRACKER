const express = require('express');
const router = express.Router();

const Workout = require('../models/Workout');
const Meal = require('../models/Meal');

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function dayKey(d) {
  const x = startOfDay(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function startOfWeekMonday(d) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

router.get('/', async (req, res) => {
  const currentUser = res.locals.currentUser;
  const isLoggedIn = !!currentUser;

  const baseProps = {
    currentPath: '/',
    isLoggedIn,
    todayWorkoutCount: 0,
    todayVolume: 0,
    todayCalories: 0,
    weeklyWorkouts: 0,
    weeklyWorkoutsCount: 0,
    weeklyGoal: isLoggedIn ? (Number(currentUser.weeklyGoal) || 4) : 4,
    weeklyProgressPercent: 0,
    streakDays: 0,
    workoutOfDay: null
  };

  if (!isLoggedIn) return res.render('home', baseProps);

  try {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);

    const weekStart = startOfWeekMonday(today);
    const weekEnd = addDays(weekStart, 7);

    const lookbackStart = addDays(today, -60);

    const todayWorkouts = await Workout.find({
      user: currentUser._id,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ date: -1 });

    const todayWorkoutCount = todayWorkouts.length;

    const todayVolume = todayWorkouts.reduce((sum, w) => {
      const sets = Number(w.sets || 0);
      const reps = Number(w.reps || 0);
      const weight = Number(w.weight || 0);
      return sum + sets * reps * weight;
    }, 0);

    const todayMeals = await Meal.find({
      user: currentUser._id,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ date: -1 });

    const todayCalories = todayMeals.reduce((sum, m) => sum + Number(m.calories || 0), 0);

    const weeklyWorkoutsDocs = await Workout.find({
      user: currentUser._id,
      date: { $gte: weekStart, $lt: weekEnd }
    }).sort({ date: 1 });

    const weeklyWorkoutsCount = weeklyWorkoutsDocs.length;

    const weeklyDaySet = new Set();
    for (const w of weeklyWorkoutsDocs) weeklyDaySet.add(dayKey(w.date));

    const weeklyWorkouts = weeklyDaySet.size;
    const weeklyGoal = Number(currentUser.weeklyGoal) || 4;

    const weeklyProgressPercent =
      weeklyGoal > 0 ? Math.min(Math.round((weeklyWorkouts / weeklyGoal) * 100), 100) : 0;

    const streakDocs = await Workout.find({
      user: currentUser._id,
      date: { $gte: lookbackStart, $lt: tomorrow }
    }).sort({ date: -1 });

    const streakDaySet = new Set();
    for (const w of streakDocs) streakDaySet.add(dayKey(w.date));

    let streakDays = 0;
    let cursor = today;
    while (streakDaySet.has(dayKey(cursor))) {
      streakDays += 1;
      cursor = addDays(cursor, -1);
    }

    const workoutOfDay =
      todayWorkouts[0] || (weeklyWorkoutsDocs.length ? weeklyWorkoutsDocs[weeklyWorkoutsDocs.length - 1] : null);

    return res.render('home', {
      ...baseProps,
      todayWorkoutCount,
      todayVolume,
      todayCalories,
      weeklyWorkouts,
      weeklyWorkoutsCount,
      weeklyGoal,
      weeklyProgressPercent,
      streakDays,
      workoutOfDay
    });
  } catch (err) {
    console.error('Home route error:', err);
    return res.render('home', baseProps);
  }
});

module.exports = router; 