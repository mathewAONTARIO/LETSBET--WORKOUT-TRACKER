const mongoose = require('mongoose');
const Workout = require('../models/Workout');
const Settings = require('../models/Settings');

function getUserId(req) {
  return req.session && req.session.userId;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

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
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function startOfWeekMonday(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeekMonday(d) {
  const start = startOfWeekMonday(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setHours(0, 0, 0, 0);
  return end;
}

async function getWeeklyGoalForUser(userId) {
  try {
    const s = await Settings.findOne({ user: userId }).lean();
    const goal = Number(s && (s.weeklyGoal ?? s.weekly_workout_goal ?? s.goal));
    if (Number.isFinite(goal) && goal > 0) return goal;
    return 5;
  } catch (e) {
    return 5;
  }
}

/* -------------------- QUICK LOG (TEMPLATES) -------------------- */

const QUICK_TEMPLATES = {
  push: {
    label: 'Push',
    category: 'Push',
    exercises: ['Bench Press', 'Incline DB Press', 'Shoulder Press', 'Lateral Raises', 'Tricep Pushdown', 'Dips']
  },
  pull: {
    label: 'Pull',
    category: 'Pull',
    exercises: ['Deadlift', 'Lat Pulldown', 'Seated Row', 'One-Arm DB Row', 'Face Pull', 'Hammer Curls']
  },
  legs: {
    label: 'Legs',
    category: 'Legs',
    exercises: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Walking Lunges', 'Leg Curl', 'Calf Raises']
  },
  upper: {
    label: 'Upper Body',
    category: 'Upper Body',
    exercises: ['Bench Press', 'Row', 'Shoulder Press', 'Lat Pulldown', 'Lateral Raises', 'Curls']
  },
  lower: {
    label: 'Lower Body',
    category: 'Lower Body',
    exercises: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raises', 'Abs']
  },
  full: {
    label: 'Full Body',
    category: 'Full Body',
    exercises: ['Squat', 'Bench Press', 'Row', 'Shoulder Press', 'Romanian Deadlift', 'Plank']
  },
  cardio: {
    label: 'Cardio',
    category: 'Cardio',
    exercises: ['Run', 'Incline Walk', 'Bike', 'Stairmaster']
  }
};

exports.showQuickLog = (req, res) => {
  res.render('workouts/quick', {
    currentPath: '/workouts/quick',
    today: new Date().toISOString().slice(0, 10),
    templates: QUICK_TEMPLATES
  });
};

exports.createQuickLog = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const split = String(req.body.split || '');
    const pickedDate = toDateOrToday(req.body.date);
    const t = QUICK_TEMPLATES[split];

    if (!t) return res.redirect('/workouts/quick?toast=error&type=error');

    const docs = t.exercises.map(exercise => ({
      user: userId,
      exercise,
      category: t.category,
      sets: 3,
      reps: 10,
      weight: 0,
      date: startOfDay(pickedDate),
      notes: '',
      isPR: false
    }));

    await Workout.insertMany(docs);

    return res.redirect('/workouts?toast=workout-saved&type=success');
  } catch (err) {
    console.error('createQuickLog error:', err);
    return res.redirect('/workouts?toast=error&type=error');
  }
};

/* -------------------- EXISTING CONTROLLER ACTIONS -------------------- */

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
      date: toDateOrToday(date),
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
      date: toDateOrToday(forcedDate),
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
        date: toDateOrToday(date),
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

/* ==========================================================
   ✅ FIX: streak + weekly should NOT count future workouts
========================================================== */
exports.getStreak = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ✅ ignore future workouts
    const workouts = await Workout.find({
      user: userId,
      date: { $lt: tomorrow }
    })
      .sort({ date: 1 })
      .lean();

    const daySet = new Set();
    for (const w of workouts) {
      if (!w.date) continue;
      const d = new Date(w.date);
      if (d >= tomorrow) continue;
      daySet.add(d.toISOString().slice(0, 10));
    }

    const days = Array.from(daySet).sort();

    let currentStreak = 0;
    let cursor = new Date(today);
    while (daySet.has(cursor.toISOString().slice(0, 10))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    let longestStreak = 0;
    if (days.length > 0) {
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
    }

    const weekStart = startOfWeekMonday(today);
    // const weekEnd = endOfWeekMonday(today); // not needed for “completed” count

    const workoutsThisWeekDocs = await Workout.find({
      user: userId,
      date: { $gte: weekStart, $lt: tomorrow }
    })
      .select('date')
      .lean();

    const weekDaySet = new Set();
    for (const w of workoutsThisWeekDocs) {
      if (!w.date) continue;
      weekDaySet.add(new Date(w.date).toISOString().slice(0, 10));
    }

    const workoutsThisWeek = weekDaySet.size;
    const weeklyGoal = await getWeeklyGoalForUser(userId);

    res.render('workouts/streak', {
      currentStreak,
      longestStreak,
      totalDays: days.length,
      lastWorkoutDate: days.length ? days.at(-1) : null,
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

/* ==========================================================
   ✅ FIX: stats should NOT count future workouts
========================================================== */
exports.getStats = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const workouts = await Workout.find({
      user: userId,
      date: { $lt: tomorrow }
    }).lean();

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

    const workouts = await Workout.find({ user: userId }).lean();

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

    const monthStart = new Date(base.getFullYear(), base.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    monthEnd.setHours(0, 0, 0, 0);

    const workouts = await Workout.find({
      user: userId,
      date: { $gte: monthStart, $lt: monthEnd }
    }).select('date weight sets reps').lean();

    const workoutDays = new Set();
    for (const w of workouts) {
      if (!w.date) continue;
      workoutDays.add(new Date(w.date).toISOString().slice(0, 10));
    }

    const firstDayOfMonth = new Date(base.getFullYear(), base.getMonth(), 1);
    const startGrid = new Date(firstDayOfMonth);
    startGrid.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());
    startGrid.setHours(0, 0, 0, 0);

    const lastDayOfMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const endGrid = new Date(lastDayOfMonth);
    endGrid.setDate(endGrid.getDate() + (6 - endGrid.getDay()));
    endGrid.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = ymd(today);

    const daysGrid = [];
    let cursor = new Date(startGrid);

    while (cursor <= endGrid) {
      const key = ymd(cursor);
      const inMonth = cursor.getMonth() === base.getMonth();
      const isToday = key === todayKey;
      const isFuture = cursor > today;
      const hasWorkout = workoutDays.has(key);

      daysGrid.push({
        label: key,
        day: cursor.getDate(),
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
      monthLabel: monthLabelFromDate(base),
      days: daysGrid
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