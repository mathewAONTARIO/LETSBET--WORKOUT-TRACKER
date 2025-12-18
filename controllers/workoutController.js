// controllers/workoutController.js
const mongoose = require('mongoose');
const Workout = require('../models/Workout');

function getUserId(req) {
  return req.session && req.session.userId;
}

// Force YYYY-MM-DD to a consistent Date (UTC midnight)
function normalizeDate(dateStr) {
  if (!dateStr) return null;
  // Expecting "YYYY-MM-DD"
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// For /day/:date, query the whole day (UTC)
function dayRange(dateStr) {
  const start = normalizeDate(dateStr);
  if (!start || Number.isNaN(start.getTime())) return null;

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function toNumber(v) {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

exports.getWorkouts = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const workouts = await Workout.find({ user: userId }).sort({ date: -1 });

    res.render('workouts/list', {
      workouts,
      currentPath: '/workouts'
    });
  } catch (err) {
    console.error('getWorkouts error:', err);
    res.render('workouts/list', {
      workouts: [],
      currentPath: '/workouts'
    });
  }
};

exports.showNewForm = (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.redirect('/auth/login');

  const todayStr = new Date().toISOString().slice(0, 10);

  res.render('workouts/new', {
    currentPath: '/workouts/new',
    today: todayStr,
    formAction: '/workouts/new'
  });
};

exports.createWorkout = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const { exercise, category, date, notes, isPR } = req.body;

    const sets = toNumber(req.body.sets);
    const reps = toNumber(req.body.reps);
    const weight = toNumber(req.body.weight);

    const safeDate = normalizeDate(date) || normalizeDate(new Date().toISOString().slice(0, 10));

    await Workout.create({
      exercise,
      category,
      sets,
      reps,
      weight,
      date: safeDate,
      notes,
      isPR: isPR === 'on',
      user: userId
    });

    res.redirect('/workouts?toast=workout-saved&type=success');
  } catch (err) {
    console.error('createWorkout error:', err);
    res.redirect('/workouts?toast=error&type=error');
  }
};

exports.showNewFormForDate = (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.redirect('/auth/login');

  const dateStr = req.params.date;

  res.render('workouts/new', {
    currentPath: '/workouts/new',
    today: dateStr,
    formAction: `/workouts/day/${dateStr}/new`
  });
};

exports.createWorkoutForDate = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const forcedDateStr = req.params.date;

    const { exercise, category, notes, isPR } = req.body;
    const sets = toNumber(req.body.sets);
    const reps = toNumber(req.body.reps);
    const weight = toNumber(req.body.weight);

    const safeDate = normalizeDate(forcedDateStr);

    await Workout.create({
      exercise,
      category,
      sets,
      reps,
      weight,
      date: safeDate,
      notes,
      isPR: isPR === 'on',
      user: userId
    });

    res.redirect(`/workouts/day/${forcedDateStr}?toast=workout-saved&type=success`);
  } catch (err) {
    console.error('createWorkoutForDate error:', err);
    res.redirect(`/workouts/day/${req.params.date}?toast=error&type=error`);
  }
};

exports.duplicateWorkout = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const original = await Workout.findOne({
      _id: req.params.id,
      user: userId
    });

    if (!original) {
      return res.redirect('/workouts?toast=error&type=error');
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    await Workout.create({
      exercise: original.exercise,
      category: original.category,
      sets: original.sets,
      reps: original.reps,
      weight: original.weight,
      date: normalizeDate(todayStr),
      notes: original.notes,
      isPR: false,
      user: userId
    });

    res.redirect('/workouts?toast=workout-duplicated&type=success');
  } catch (err) {
    console.error('duplicateWorkout error:', err);
    res.redirect('/workouts?toast=error&type=error');
  }
};

exports.showEditForm = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const workout = await Workout.findOne({
      _id: req.params.id,
      user: userId
    });

    if (!workout) return res.redirect('/workouts');

    res.render('workouts/edit', {
      workout,
      currentPath: '/workouts'
    });
  } catch (err) {
    console.error('showEditForm error:', err);
    res.redirect('/workouts');
  }
};

exports.updateWorkout = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const { exercise, category, date, notes, isPR } = req.body;

    const sets = toNumber(req.body.sets);
    const reps = toNumber(req.body.reps);
    const weight = toNumber(req.body.weight);

    const safeDate = normalizeDate(date);

    await Workout.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      {
        exercise,
        category,
        sets,
        reps,
        weight,
        date: safeDate,
        notes,
        isPR: isPR === 'on'
      }
    );

    res.redirect('/workouts?toast=workout-saved&type=success');
  } catch (err) {
    console.error('updateWorkout error:', err);
    res.redirect('/workouts?toast=error&type=error');
  }
};

exports.showDeleteConfirm = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const workout = await Workout.findOne({
      _id: req.params.id,
      user: userId
    });

    if (!workout) return res.redirect('/workouts');

    res.render('workouts/delete', {
      workout,
      currentPath: '/workouts'
    });
  } catch (err) {
    console.error('showDeleteConfirm error:', err);
    res.redirect('/workouts');
  }
};

exports.deleteWorkout = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) return res.redirect('/auth/login');

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.redirect('/workouts?toast=error&type=error');
    }

    await Workout.findOneAndDelete({
      _id: id,
      user: userId
    });

    res.redirect('/workouts?toast=workout-deleted&type=success');
  } catch (err) {
    console.error('deleteWorkout error:', err);
    res.redirect('/workouts?toast=error&type=error');
  }
};

exports.getStreak = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const workouts = await Workout.find({ user: userId }).sort({ date: 1 });

    const daySet = new Set();
    workouts.forEach(w => {
      if (!w.date) return;
      const key = new Date(w.date).toISOString().slice(0, 10);
      daySet.add(key);
    });

    const days = Array.from(daySet).sort();

    let currentStreak = 0;
    let longestStreak = 0;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let cursor = new Date(today);
    while (daySet.has(cursor.toISOString().slice(0, 10))) {
      currentStreak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    let temp = 1;
    for (let i = 1; i < days.length; i++) {
      const diff =
        (new Date(days[i]) - new Date(days[i - 1])) /
        (1000 * 60 * 60 * 24);
      if (diff === 1) temp++;
      else {
        longestStreak = Math.max(longestStreak, temp);
        temp = 1;
      }
    }
    longestStreak = Math.max(longestStreak, temp);

    res.render('workouts/streak', {
      currentStreak,
      longestStreak,
      totalDays: days.length,
      lastWorkoutDate: days.at(-1),
      workoutsThisWeek: 0,
      weeklyGoal: 0,
      currentPath: '/workouts/streak'
    });
  } catch (err) {
    console.error('getStreak error:', err);
    res.render('workouts/streak', {
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
      lastWorkoutDate: null,
      workoutsThisWeek: 0,
      weeklyGoal: 0,
      currentPath: '/workouts/streak'
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const workouts = await Workout.find({ user: userId });

    const totalWorkouts = workouts.length;
    const totalWeight = workouts.reduce(
      (sum, w) => sum + (w.weight || 0) * (w.sets || 0) * (w.reps || 0),
      0
    );

    res.render('workouts/stats', {
      totalWorkouts,
      totalWeight,
      prs: [],
      chartLabels: '[]',
      chartData: '[]',
      currentPath: '/workouts/stats'
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.render('workouts/stats', {
      totalWorkouts: 0,
      totalWeight: 0,
      prs: [],
      chartLabels: '[]',
      chartData: '[]',
      currentPath: '/workouts/stats'
    });
  }
};

exports.getPRs = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const workouts = await Workout.find({ user: userId });

    res.render('workouts/prs', {
      prs: workouts.filter(w => w.isPR),
      currentPath: '/workouts/stats'
    });
  } catch (err) {
    console.error('getPRs error:', err);
    res.render('workouts/prs', {
      prs: [],
      currentPath: '/workouts/stats'
    });
  }
};

exports.getLibrary = (req, res) => {
  res.render('workouts/library', { currentPath: '/workouts/library' });
};

exports.getCalendar = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.redirect('/auth/login');

  res.render('workouts/calendar', { currentPath: '/workouts/calendar' });
};

exports.getDaySummary = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const range = dayRange(req.params.date);
    if (!range) return res.redirect('/workouts/calendar');

    const workouts = await Workout.find({
      user: userId,
      date: { $gte: range.start, $lt: range.end }
    }).sort({ date: -1 });

    res.render('workouts/day', {
      workouts,
      selectedDate: req.params.date,
      currentPath: '/workouts/calendar'
    });
  } catch (err) {
    console.error('getDaySummary error:', err);
    res.redirect('/workouts/calendar');
  }
};