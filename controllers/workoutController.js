const Workout = require('../models/Workout');

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

exports.getHome = async (req, res) => {
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 6);

  const weeklyRangeStart = startOfDay(sevenDaysAgo);
  const weeklyRangeEnd = endOfDay(today);

  const weeklyWorkoutsDocs = await Workout.find({
    date: { $gte: weeklyRangeStart, $lte: weeklyRangeEnd }
  }).sort({ date: 1 });

  const weeklyWorkouts = weeklyWorkoutsDocs.length;

  let weeklyVolume = 0;
  const volumeByDate = {};

  weeklyWorkoutsDocs.forEach(w => {
    const volume = (w.sets || 0) * (w.reps || 0) * (w.weight || 0);
    weeklyVolume += volume;
    const key = w.date.toISOString().slice(0, 10);
    volumeByDate[key] = (volumeByDate[key] || 0) + volume;
  });

  let bestDay = null;
  let bestVolume = 0;

  Object.entries(volumeByDate).forEach(([key, vol]) => {
    if (vol > bestVolume) {
      bestVolume = vol;
      bestDay = key;
    }
  });

  if (bestDay) {
    const d = new Date(bestDay);
    bestDay = d.toLocaleDateString('en-US', { weekday: 'short' });
  }

  const workoutOfDay = weeklyWorkoutsDocs[weeklyWorkoutsDocs.length - 1] || null;

  const weeklyGoal = 4;
  const weeklyProgress = Math.min(weeklyWorkouts, weeklyGoal);
  const goalPercent = weeklyGoal ? Math.round((weeklyWorkouts / weeklyGoal) * 100) : 0;

  res.render('index', {
    weeklyWorkouts,
    weeklyVolume,
    bestDay,
    workoutOfDay,
    weeklyGoal,
    weeklyProgress,
    goalPercent,
    profileName: 'Mathew'
  });
};

exports.getWorkouts = async (req, res) => {
  const { q, category, date } = req.query;
  const filter = {};

  if (q && q.trim() !== '') {
    filter.exercise = { $regex: q.trim(), $options: 'i' };
  }

  if (category && category !== 'All') {
    filter.category = category;
  }

  if (date && date.trim() !== '') {
    const d = new Date(date);
    filter.date = { $gte: startOfDay(d), $lte: endOfDay(d) };
  }

  const workouts = await Workout.find(filter).sort({ date: -1 });

  const allWorkouts = await Workout.find({}).select('exercise weight').lean();
  const prsByExercise = {};

  allWorkouts.forEach(w => {
    if (!w.weight) return;
    const key = w.exercise.toLowerCase();
    if (!prsByExercise[key] || w.weight > prsByExercise[key]) {
      prsByExercise[key] = w.weight;
    }
  });

  res.render('workouts/list', {
    workouts,
    filters: {
      q: q || '',
      category: category || 'All',
      date: date || ''
    },
    prsByExercise
  });
};

exports.showNewForm = (req, res) => {
  res.render('workouts/new');
};

exports.createWorkout = async (req, res) => {
  const { exercise, category, sets, reps, weight, date, notes } = req.body;

  await Workout.create({
    exercise,
    category,
    sets,
    reps,
    weight,
    date: date ? new Date(date) : new Date(),
    notes
  });

  res.redirect('/workouts');
};

exports.showEditForm = async (req, res) => {
  const workout = await Workout.findById(req.params.id);
  if (!workout) {
    return res.redirect('/workouts');
  }
  res.render('workouts/edit', { workout });
};

exports.updateWorkout = async (req, res) => {
  const { exercise, category, sets, reps, weight, date, notes } = req.body;

  await Workout.findByIdAndUpdate(req.params.id, {
    exercise,
    category,
    sets,
    reps,
    weight,
    date: date ? new Date(date) : new Date(),
    notes
  });

  res.redirect('/workouts');
};

exports.showDeleteConfirm = async (req, res) => {
  const workout = await Workout.findById(req.params.id);
  if (!workout) {
    return res.redirect('/workouts');
  }
  res.render('workouts/delete', { workout });
};

exports.deleteWorkout = async (req, res) => {
  await Workout.findByIdAndDelete(req.params.id);
  res.redirect('/workouts');
};

exports.duplicateWorkout = async (req, res) => {
  const workout = await Workout.findById(req.params.id);
  if (!workout) {
    return res.redirect('/workouts');
  }

  await Workout.create({
    exercise: workout.exercise,
    category: workout.category,
    sets: workout.sets,
    reps: workout.reps,
    weight: workout.weight,
    date: new Date(),
    notes: workout.notes
  });

  res.redirect('/workouts');
};

exports.getStreak = async (req, res) => {
  const workouts = await Workout.find({}).sort({ date: 1 }).lean();

  if (workouts.length === 0) {
    return res.render('workouts/streak', {
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
      lastWorkoutDate: null
    });
  }

  const dates = Array.from(
    new Set(workouts.map(w => w.date.toISOString().slice(0, 10)))
  ).sort();

  let currentStreak = 0;
  let longestStreak = 0;

  const today = startOfDay(new Date());
  const lastDate = startOfDay(new Date(dates[dates.length - 1]));
  const alignedStart = new Date(lastDate);

  const diffToToday = Math.round((today - lastDate) / (1000 * 60 * 60 * 24));
  alignedStart.setDate(alignedStart.getDate() + diffToToday);

  let streak = 0;
  const dateSet = new Set(dates);

  for (let i = 0; i <= dates.length + diffToToday; i++) {
    const d = new Date(alignedStart);
    d.setDate(alignedStart.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dateSet.has(key)) {
      streak += 1;
      if (streak > longestStreak) longestStreak = streak;
    } else {
      if (d.getTime() <= today.getTime()) break;
      streak = 0;
    }
  }

  currentStreak = streak;

  res.render('workouts/streak', {
    currentStreak,
    longestStreak,
    totalDays: dates.length,
    lastWorkoutDate: dates[dates.length - 1]
  });
};

exports.getStats = async (req, res) => {
  const workouts = await Workout.find({}).sort({ date: 1 }).lean();

  const volumeByDate = {};
  let totalWorkouts = workouts.length;
  let totalWeight = 0;

  workouts.forEach(w => {
    const key = w.date.toISOString().slice(0, 10);
    const volume = (w.sets || 0) * (w.reps || 0) * (w.weight || 0);
    volumeByDate[key] = (volumeByDate[key] || 0) + volume;
    totalWeight += (w.weight || 0) * (w.sets || 0);
  });

  const labels = Object.keys(volumeByDate);
  const data = labels.map(k => volumeByDate[k]);

  const maxMap = {};
  workouts.forEach(w => {
    if (!w.weight) return;
    const key = w.exercise.toLowerCase();
    if (!maxMap[key] || w.weight > maxMap[key].weight) {
      maxMap[key] = {
        exercise: w.exercise,
        weight: w.weight,
        date: w.date
      };
    }
  });

  const prs = Object.values(maxMap);

  res.render('workouts/stats', {
    labels: JSON.stringify(labels),
    data: JSON.stringify(data),
    totalWorkouts,
    totalWeight,
    prs
  });
};

exports.getCalendar = async (req, res) => {
  const today = startOfDay(new Date());
  const start = new Date(today);
  start.setDate(today.getDate() - 29);

  const workouts = await Workout.find({
    date: { $gte: start, $lte: endOfDay(today) }
  }).select('date').lean();

  const counts = {};
  workouts.forEach(w => {
    const key = w.date.toISOString().slice(0, 10);
    counts[key] = (counts[key] || 0) + 1;
  });

  const days = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const count = counts[key] || 0;
    let intensity = 0;
    if (count === 1) intensity = 1;
    else if (count === 2) intensity = 2;
    else if (count >= 3) intensity = 3;

    days.push({
      label: key,
      short: d.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit'
      }),
      hasWorkout: count > 0,
      isToday: key === today.toISOString().slice(0, 10),
      intensity
    });
  }

  res.render('workouts/calendar', { days });
};

exports.getDaySummary = async (req, res) => {
  const dateParam = req.params.date;
  const d = new Date(dateParam);
  if (isNaN(d)) {
    return res.redirect('/workouts');
  }

  const workouts = await Workout.find({
    date: { $gte: startOfDay(d), $lte: endOfDay(d) }
  }).sort({ date: 1 });

  let totalVolume = 0;
  let totalWeight = 0;

  workouts.forEach(w => {
    totalVolume += (w.sets || 0) * (w.reps || 0) * (w.weight || 0);
    totalWeight += (w.weight || 0) * (w.sets || 0);
  });

  const dateLabel = d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const allWorkouts = await Workout.find({}).select('exercise weight').lean();
  const prsByExercise = {};
  allWorkouts.forEach(w => {
    if (!w.weight) return;
    const key = w.exercise.toLowerCase();
    if (!prsByExercise[key] || w.weight > prsByExercise[key]) {
      prsByExercise[key] = w.weight;
    }
  });

  res.render('workouts/day', {
    dateLabel,
    workouts,
    totalVolume,
    totalWeight,
    totalExercises: workouts.length,
    prsByExercise
  });
};