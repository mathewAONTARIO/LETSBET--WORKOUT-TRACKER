Here’s your fixed, full workoutController.js with proper local-date handling so the correct day glows on the calendar (and streaks/stats use local dates too).

// controllers/workoutController.js
const mongoose = require('mongoose');
const Workout = require('../models/Workout');

function getUserId(req) {
  return req.session && req.session.userId;
}

// Format a Date as local YYYY-MM-DD (no UTC shift)
function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
  const todayStr = formatLocalDate(new Date());
  res.render('workouts/new', {
    currentPath: '/workouts/new',
    today: todayStr
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
  res.render('workouts/new', {
    currentPath: '/workouts/new',
    today: dateStr // pre-fill date field with that day
  });
};

exports.createWorkoutForDate = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const forcedDate = req.params.date; // YYYY-MM-DD from URL

    const {
      exercise,
      category,
      sets,
      reps,
      weight,
      notes,
      isPR
    } = req.body;

    await Workout.create({
      exercise,
      category,
      sets,
      reps,
      weight,
      date: forcedDate,   // lock to the day page you’re on
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

/* ---------- DUPLICATE ---------- */

exports.duplicateWorkout = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const original = await Workout.findOne({
      _id: req.params.id,
      user: userId
    });

    if (!original) return res.redirect('/workouts');

    await Workout.create({
      exercise: original.exercise,
      category: original.category,
      sets: original.sets,
      reps: original.reps,
      weight: original.weight,
      date: new Date(),
      notes: original.notes,
      isPR: false,
      user: userId
    });

    res.redirect('/workouts');
  } catch (err) {
    console.error('duplicateWorkout error:', err);
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
    const workouts = await Workout.find({ user: userId }).sort({ date: 1 });

    const daySet = new Set();
    workouts.forEach(w => {
      const d = new Date(w.date);
      const key = formatLocalDate(d);
      daySet.add(key);
    });

    const days = Array.from(daySet).sort();

    let currentStreak = 0;
    let longestStreak = 0;

    if (days.length > 0) {
      const today = new Date();
      const todayKey = formatLocalDate(today);

      let cursor = new Date(todayKey);
      while (true) {
        const key = formatLocalDate(cursor);
        if (daySet.has(key)) {
          currentStreak++;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }

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

    res.render('workouts/streak', {
      currentStreak,
      longestStreak,
      totalDays,
      lastWorkoutDate,
      currentPath: '/workouts/streak'
    });
  } catch (err) {
    console.error('getStreak error:', err);
    res.render('workouts/streak', {
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
      lastWorkoutDate: null,
      currentPath: '/workouts/streak'
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const userId = getUserId(req);
    const workouts = await Workout.find({ user: userId }).sort({ date: 1 });

    const totalWorkouts = workouts.length;
    const totalWeight = workouts.reduce((sum, w) => {
      const weight = w.weight || 0;
      return sum + weight * (w.sets || 1) * (w.reps || 1);
    }, 0);

    const volumeByDay = {};
    workouts.forEach(w => {
      const d = new Date(w.date);
      const key = formatLocalDate(d);
      const weight = w.weight || 1;
      const vol = (w.sets || 0) * (w.reps || 0) * weight;
      volumeByDay[key] = (volumeByDay[key] || 0) + vol;
    });

    const dayKeys = Object.keys(volumeByDay).sort();
    const labelsArr = dayKeys;
    const dataArr = dayKeys.map(k => volumeByDay[k]);

    const prMap = {};
    workouts.forEach(w => {
      if (!w.isPR || !w.weight) return;
      if (!prMap[w.exercise] || w.weight > prMap[w.exercise]) {
        prMap[w.exercise] = w.weight;
      }
    });

    const prs = Object.keys(prMap).map(ex => ({
      exercise: ex,
      weight: prMap[ex]
    }));

    res.render('workouts/stats', {
      totalWorkouts,
      totalWeight,
      prs,
      labels: JSON.stringify(labelsArr),
      data: JSON.stringify(dataArr),
      currentPath: '/workouts/stats'
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.render('workouts/stats', {
      totalWorkouts: 0,
      totalWeight: 0,
      prs: [],
      labels: JSON.stringify([]),
      data: JSON.stringify([]),
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
      const key = formatLocalDate(d);
      counts[key] = (counts[key] || 0) + 1;
    });

    const days = [];
    const today = new Date();
    const todayKey = formatLocalDate(today);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = formatLocalDate(d);
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