// controllers/workoutController.js
const mongoose = require('mongoose');
const Workout = require('../models/Workout');

function getUserId(req) {
  return req.session && req.session.userId;
}

// Helper: make date safe (accepts "YYYY-MM-DD" or Date)
function toDateOrToday(value) {
  if (!value) return new Date();

  if (value instanceof Date && !isNaN(value)) return value;

  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      if (!isNaN(dt)) return dt;
    }
    const dt = new Date(value);
    if (!isNaN(dt)) return dt;
  }

  return new Date();
}

function ymd(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function monthParamFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthLabelFromDate(d) {
  // Example: "December 2025"
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
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

  // ✅ REQUIRED by new.ejs
  res.render('workouts/new', {
    currentPath: '/workouts/new',
    today: todayStr,
    formAction: '/workouts/new',
    duplicateOf: null
  });
};

exports.createWorkout = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const { exercise, category, sets, reps, weight, date, notes, isPR } = req.body;

    await Workout.create({
      exercise,
      category,
      sets: sets ? Number(sets) : undefined,
      reps: reps ? Number(reps) : undefined,
      weight: weight ? Number(weight) : undefined,
      date: toDateOrToday(date), // ✅ date-safe
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

  // ✅ REQUIRED by new.ejs
  res.render('workouts/new', {
    currentPath: '/workouts/new',
    today: dateStr,
    formAction: `/workouts/day/${dateStr}/new`,
    duplicateOf: null
  });
};

exports.createWorkoutForDate = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const forcedDate = req.params.date;
    const { exercise, category, sets, reps, weight, notes, isPR } = req.body;

    await Workout.create({
      exercise,
      category,
      sets: sets ? Number(sets) : undefined,
      reps: reps ? Number(reps) : undefined,
      weight: weight ? Number(weight) : undefined,
      date: toDateOrToday(forcedDate), // ✅ date-safe
      notes,
      isPR: isPR === 'on',
      user: userId
    });

    res.redirect(`/workouts/day/${forcedDate}?toast=workout-saved&type=success`);
  } catch (err) {
    console.error('createWorkoutForDate error:', err);
    res.redirect(`/workouts/day/${req.params.date}?toast=error&type=error`);
  }
};

exports.duplicateWorkout = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const original = await Workout.findOne({ _id: req.params.id, user: userId }).lean();

    if (!original) return res.redirect('/workouts?toast=error&type=error');

    const todayStr = new Date().toISOString().slice(0, 10);

    // Optional: If you ever want a "duplicate -> edit before saving" flow,
    // this makes your existing new.ejs work perfectly.
    res.render('workouts/new', {
      currentPath: '/workouts/new',
      today: todayStr,
      formAction: '/workouts/new',
      duplicateOf: original
    });
  } catch (err) {
    console.error('duplicateWorkout error:', err);
    res.redirect('/workouts?toast=error&type=error');
  }
};

exports.showEditForm = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const workout = await Workout.findOne({ _id: req.params.id, user: userId });

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

    const { exercise, category, sets, reps, weight, date, notes, isPR } = req.body;

    await Workout.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      {
        exercise,
        category,
        sets: sets ? Number(sets) : undefined,
        reps: reps ? Number(reps) : undefined,
        weight: weight ? Number(weight) : undefined,
        date: toDateOrToday(date), // ✅ date-safe
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

    const workout = await Workout.findOne({ _id: req.params.id, user: userId });

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

    await Workout.findOneAndDelete({ _id: id, user: userId });

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
      daySet.add(new Date(w.date).toISOString().slice(0, 10));
    });

    const days = Array.from(daySet).sort();

    let currentStreak = 0;
    let longestStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let cursor = new Date(today);
    while (daySet.has(cursor.toISOString().slice(0, 10))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    let temp = 1;
    for (let i = 1; i < days.length; i++) {
      const diff = (new Date(days[i]) - new Date(days[i - 1])) / (1000 * 60 * 60 * 24);
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
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    // month query: YYYY-MM
    const monthParam = typeof req.query.month === 'string' ? req.query.month : '';
    let base = new Date();
    base.setDate(1);
    base.setHours(0, 0, 0, 0);

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split('-').map(Number);
      base = new Date(y, m - 1, 1);
      base.setHours(0, 0, 0, 0);
    }

    const prev = new Date(base.getFullYear(), base.getMonth() - 1, 1);
    const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);

    // Month range for workouts lookup
    const monthStart = new Date(base.getFullYear(), base.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    monthEnd.setHours(0, 0, 0, 0);

    // Pull workouts in this month (for hasWorkout)
    const workouts = await Workout.find({
      user: userId,
      date: { $gte: monthStart, $lt: monthEnd }
    }).select('date weight sets reps').lean();

    const workoutDays = new Set();
    workouts.forEach(w => {
      if (!w.date) return;
      workoutDays.add(new Date(w.date).toISOString().slice(0, 10));
    });

    // Build calendar grid (Sunday-start)
    const firstDayOfMonth = new Date(base.getFullYear(), base.getMonth(), 1);
    const startGrid = new Date(firstDayOfMonth);
    startGrid.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay()); // back to Sunday
    startGrid.setHours(0, 0, 0, 0);

    const lastDayOfMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const endGrid = new Date(lastDayOfMonth);
    endGrid.setDate(lastDayOfMonth.getDate() + (6 - lastDayOfMonth.getDay())); // forward to Saturday
    endGrid.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = ymd(today);

    const days = [];
    let cursor = new Date(startGrid);

    while (cursor <= endGrid) {
      const key = ymd(cursor);
      const inMonth = cursor.getMonth() === base.getMonth();
      const isToday = key === todayKey;
      const isFuture = cursor > today;
      const hasWorkout = workoutDays.has(key);

      // you had "intensity" in EJS; keep it simple for now
      // (you can later calculate intensity based on volume)
      days.push({
        label: key,            // "YYYY-MM-DD"
        day: cursor.getDate(), // number
        inMonth,
        isToday,
        isFuture,
        hasWorkout,
        intensity: null
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    res.render('workouts/calendar', {
      currentPath: '/workouts/calendar',
      prevMonthParam: monthParamFromDate(prev),
      nextMonthParam: monthParamFromDate(next),
      monthLabel: monthLabelFromDate(base), // ✅ REQUIRED by calendar.ejs
      days                                // ✅ REQUIRED by calendar.ejs
    });
  } catch (err) {
    console.error('getCalendar error:', err);
    res.redirect('/workouts');
  }
};

exports.getDaySummary = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const picked = toDateOrToday(req.params.date);

    const start = new Date(picked);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const workouts = await Workout.find({
      user: userId,
      date: { $gte: start, $lt: end }
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