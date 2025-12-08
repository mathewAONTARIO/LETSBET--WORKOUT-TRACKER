// controllers/workoutController.js
const mongoose = require('mongoose');
const Workout = require('../models/Workout');

function getUserId(req) {
  return req.session && req.session.userId;
}

/* ---------- LIST ---------- */

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

/* ---------- CREATE (NORMAL) ---------- */

exports.showNewForm = (req, res) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Normal "Add Workout" form
  res.render('workouts/new', {
    currentPath: '/workouts/new',
    today: todayStr,
    formAction: '/workouts/new', // POST here
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
      sets,
      reps,
      weight,
      date,
      notes,
      isPR: isPR === 'on',
      user: userId
    });

    res.redirect('/workouts');
  } catch (err) {
    console.error('createWorkout error:', err);
    res.redirect('/workouts');
  }
};

/* ---------- CREATE FOR SPECIFIC DAY (FROM CALENDAR) ---------- */

exports.showNewFormForDate = (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.redirect('/auth/login');

  const dateStr = req.params.date; // YYYY-MM-DD from URL

  // Form opened from calendar → lock to that day
  res.render('workouts/new', {
    currentPath: '/workouts/new',
    today: dateStr,
    formAction: `/workouts/day/${dateStr}/new`, // POST back to that day
    duplicateOf: null
  });
};

exports.createWorkoutForDate = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const forcedDate = req.params.date; // YYYY-MM-DD from URL
    const { exercise, category, sets, reps, weight, notes, isPR } = req.body;

    await Workout.create({
      exercise,
      category,
      sets,
      reps,
      weight,
      date: forcedDate, // lock to the day page you’re on
      notes,
      isPR: isPR === 'on',
      user: userId
    });

    // After adding, go back to that day’s summary
    res.redirect(`/workouts/day/${forcedDate}`);
  } catch (err) {
    console.error('createWorkoutForDate error:', err);
    res.redirect('/workouts');
  }
};

/* ---------- DUPLICATE (OPEN PREFILLED FORM) ---------- */

exports.showDuplicateForm = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const original = await Workout.findOne({
      _id: req.params.id,
      user: userId
    });

    if (!original) {
      console.warn('showDuplicateForm: original not found for id', req.params.id);
      return res.redirect('/workouts');
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    // Reuse the "new" form but prefill with this workout's data.
    res.render('workouts/new', {
      currentPath: '/workouts',
      today: todayStr, // keep date default to today
      formAction: '/workouts/new',
      duplicateOf: original
    });
  } catch (err) {
    console.error('showDuplicateForm error:', err);
    res.redirect('/workouts');
  }
};

/* ---------- EDIT / UPDATE ---------- */

exports.showEditForm = async (req, res) => {
  try {
    const userId = getUserId(req);

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
    const { exercise, category, sets, reps, weight, date, notes, isPR } = req.body;

    await Workout.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      {
        exercise,
        category,
        sets,
        reps,
        weight,
        date,
        notes,
        isPR: isPR === 'on'
      }
    );

    res.redirect('/workouts');
  } catch (err) {
    console.error('updateWorkout error:', err);
    res.redirect('/workouts');
  }
};

/* ---------- DELETE (SAFE) ---------- */

exports.showDeleteConfirm = async (req, res) => {
  try {
    const userId = getUserId(req);

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

// safer delete – checks id + user, never crashes
exports.deleteWorkout = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      console.warn('deleteWorkout: no user in session');
      return res.redirect('/auth/login');
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.warn('deleteWorkout: invalid workout id', id);
      return res.redirect('/workouts');
    }

    const deleted = await Workout.findOneAndDelete({
      _id: id,
      user: userId
    });

    if (!deleted) {
      console.warn('deleteWorkout: nothing deleted for id', id);
    }

    return res.redirect('/workouts');
  } catch (err) {
    console.error('deleteWorkout error:', err);
    return res.redirect('/workouts');
  }
};

/* ---------- STREAK / STATS / PRS / LIBRARY ---------- */

exports.getStreak = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const workouts = await Workout.find({ user: userId }).sort({ date: 1 });

    const daySet = new Set();
    workouts.forEach(w => {
      if (!w.date) return;
      const d = new Date(w.date);
      const key = d.toISOString().slice(0, 10);
      daySet.add(key);
    });

    const days = Array.from(daySet).sort();

    let currentStreak = 0;
    let longestStreak = 0;

    // today (normalized to midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().slice(0, 10);

    if (days.length > 0) {
      // current streak: walk backwards from today
      let cursor = new Date(todayKey);
      while (true) {
        const key = cursor.toISOString().slice(0, 10);
        if (daySet.has(key)) {
          currentStreak++;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }

      // longest streak over history
      let temp = 1;
      for (let i = 1; i < days.length; i++) {
        const prev = new Date(days[i - 1]);
        const curr = new Date(days[i]);
        const diff = (curr - prev) / (1000 * 60 * 60 * 24);
        if (diff === 1) temp++;
        else {
          if (temp > longestStreak) longestStreak = temp;
          temp = 1;
        }
      }
      if (temp > longestStreak) longestStreak = temp;
    }

    const totalDays = days.length;
    const lastWorkoutDate =
      workouts.length > 0
        ? new Date(workouts[workouts.length - 1].date).toLocaleDateString()
        : null;

    // ---- Weekly progress toward goal ----
    const startOfWeek = new Date(today);
    // Sunday = 0, Monday = 1, ...
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const workoutDaysThisWeek = new Set();

    workouts.forEach(w => {
      if (!w.date) return;
      const d = new Date(w.date);
      d.setHours(0, 0, 0, 0);
      if (d >= startOfWeek && d <= today) {
        const key = d.toISOString().slice(0, 10);
        workoutDaysThisWeek.add(key);
      }
    });

    const workoutsThisWeek = workoutDaysThisWeek.size;

    const currentUser = res.locals.currentUser || {};
    const weeklyGoal = currentUser.weeklyGoal || 0;

    res.render('workouts/streak', {
      currentStreak,
      longestStreak,
      totalDays,
      lastWorkoutDate,
      workoutsThisWeek,
      weeklyGoal,
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

/**
 * Nicer stats:
 * - Total workouts + volume
 * - Line chart for LAST 30 DAYS only (shorter, cleaner)
 * - PR list stays the same
 */
exports.getStats = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const workouts = await Workout.find({ user: userId }).sort({ date: 1 });

    const totalWorkouts = workouts.length;
    const totalWeight = workouts.reduce((sum, w) => {
      const weight = w.weight || 0;
      const sets = w.sets || 0;
      const reps = w.reps || 0;
      return sum + weight * sets * reps;
    }, 0);

    // ----- Build volume over LAST 30 DAYS -----
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(today);
    start.setDate(start.getDate() - 29); // 30 days including today

    const volumeByDay = new Map(); // key: YYYY-MM-DD, value: volume

    workouts.forEach(w => {
      if (!w.date) return;

      const d = new Date(w.date);
      d.setHours(0, 0, 0, 0);

      if (d < start || d > today) return; // ignore outside 30-day window

      const key = d.toISOString().slice(0, 10);
      const sets = w.sets || 0;
      const reps = w.reps || 0;
      const weight = w.weight || 0;
      const vol = sets * reps * weight;

      volumeByDay.set(key, (volumeByDay.get(key) || 0) + vol);
    });

    const chartLabels = [];
    const chartData = [];

    const cursor = new Date(start);
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10);
      chartLabels.push(key);
      chartData.push(volumeByDay.get(key) || 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    // ----- Personal records -----
    const prMap = {};
    workouts.forEach(w => {
      if (!w.isPR || !w.weight) return;
      if (!prMap[w.exercise] || w.weight > prMap[w.exercise].weight) {
        prMap[w.exercise] = {
          weight: w.weight,
          date: w.date
        };
      }
    });

    const prs = Object.keys(prMap).map(ex => ({
      exercise: ex,
      weight: prMap[ex].weight,
      date: prMap[ex].date.toLocaleDateString()
    }));

    res.render('workouts/stats', {
      totalWorkouts,
      totalWeight,
      prs,
      chartLabels: JSON.stringify(chartLabels),
      chartData: JSON.stringify(chartData),
      currentPath: '/workouts/stats'
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.render('workouts/stats', {
      totalWorkouts: 0,
      totalWeight: 0,
      prs: [],
      chartLabels: JSON.stringify([]),
      chartData: JSON.stringify([]),
      currentPath: '/workouts/stats'
    });
  }
};

exports.getPRs = async (req, res) => {
  try {
    const userId = getUserId(req);
    const workouts = await Workout.find({ user: userId }).sort({ date: 1 });

    const prMap = {};
    workouts.forEach(w => {
      if (!w.isPR || !w.weight) return;
      if (!prMap[w.exercise] || w.weight > prMap[w.exercise].weight) {
        prMap[w.exercise] = {
          weight: w.weight,
          date: w.date
        };
      }
    });

    const prs = Object.keys(prMap).map(ex => ({
      exercise: ex,
      weight: prMap[ex].weight,
      date: prMap[ex].date.toLocaleDateString()
    }));

    res.render('workouts/prs', {
      prs,
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

/* ---------- CALENDAR / DAY SUMMARY ---------- */

exports.getCalendar = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    let baseDate;
    if (req.query.month) {
      const [yearStr, monthStr] = req.query.month.split('-');
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10) - 1;
      baseDate = new Date(year, monthIndex, 1);
    } else {
      baseDate = new Date();
    }

    const year = baseDate.getFullYear();
    const monthIndex = baseDate.getMonth();

    const firstOfMonth = new Date(year, monthIndex, 1);
    const lastOfMonth = new Date(year, monthIndex + 1, 0);

    const start = new Date(firstOfMonth);
    start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

    const end = new Date(lastOfMonth);
    end.setDate(lastOfMonth.getDate() + (6 - lastOfMonth.getDay()));

    const workouts = await Workout.find({
      user: userId,
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });

    const counts = {};
    workouts.forEach(w => {
      const d = new Date(w.date);
      const key = d.toISOString().slice(0, 10);
      counts[key] = (counts[key] || 0) + 1;
    });

    const days = [];
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const count = counts[key] || 0;

      let intensity = 0;
      if (count === 1) intensity = 1;
      else if (count > 1 && count <= 3) intensity = 2;
      else if (count > 3) intensity = 3;

      days.push({
        label: key,
        day: d.getDate(),
        inMonth: d.getMonth() === monthIndex,
        intensity,
        hasWorkout: count > 0,
        isToday: key === todayKey
      });
    }

    const monthLabel = firstOfMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });

    const prevMonth = new Date(year, monthIndex - 1, 1);
    const nextMonth = new Date(year, monthIndex + 1, 1);

    const prevMonthParam = `${prevMonth.getFullYear()}-${String(
      prevMonth.getMonth() + 1
    ).padStart(2, '0')}`;
    const nextMonthParam = `${nextMonth.getFullYear()}-${String(
      nextMonth.getMonth() + 1
    ).padStart(2, '0')}`;

    res.render('workouts/calendar', {
      days,
      monthLabel,
      prevMonthParam,
      nextMonthParam,
      currentPath: '/workouts/calendar'
    });
  } catch (err) {
    console.error('getCalendar error:', err);
    res.render('workouts/calendar', {
      days: [],
      monthLabel: '',
      prevMonthParam: '',
      nextMonthParam: '',
      currentPath: '/workouts/calendar'
    });
  }
};

exports.getDaySummary = async (req, res) => {
  try {
    const userId = getUserId(req);

    const day = new Date(req.params.date);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);

    const workouts = await Workout.find({
      user: userId,
      date: { $gte: day, $lt: nextDay }
    }).sort({ date: 1 });

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