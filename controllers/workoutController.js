const Workout = require('../models/Workout');

function getUserId(req) {
  return req.session && req.session.userId;
}

exports.getWorkouts = async (req, res) => {
  try {
    const userId = getUserId(req);
    const workouts = await Workout.find({ user: userId }).sort({ date: -1 });

    // use the correct EJS file name here
    res.render('workouts/list', {
      workouts,
      currentPath: '/workouts'
    });
  } catch (err) {
    console.error(err);
    res.render('workouts/list', {
      workouts: [],
      currentPath: '/workouts'
    });
  }
};

exports.showNewForm = (req, res) => {
  res.render('workouts/new', { currentPath: '/workouts/new' });
};

exports.createWorkout = async (req, res) => {
  try {
    const userId = getUserId(req);
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
    console.error(err);
    res.redirect('/workouts');
  }
};

exports.duplicateWorkout = async (req, res) => {
  try {
    const userId = getUserId(req);

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
    console.error(err);
    res.redirect('/workouts');
  }
};

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
    console.error(err);
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
    console.error(err);
    res.redirect('/workouts');
  }
};

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
    console.error(err);
    res.redirect('/workouts');
  }
};

exports.deleteWorkout = async (req, res) => {
  try {
    const userId = getUserId(req);

    await Workout.findOneAndDelete({
      _id: req.params.id,
      user: userId
    });

    res.redirect('/workouts');
  } catch (err) {
    console.error(err);
    res.redirect('/workouts');
  }
};

exports.getStreak = async (req, res) => {
  try {
    const userId = getUserId(req);
    const workouts = await Workout.find({ user: userId }).sort({ date: 1 });

    const daySet = new Set();
    workouts.forEach(w => {
      const d = new Date(w.date);
      const key = d.toISOString().slice(0, 10);
      daySet.add(key);
    });

    const days = Array.from(daySet).sort();

    let currentStreak = 0;
    let longestStreak = 0;

    if (days.length > 0) {
      const today = new Date();
      const todayKey = today.toISOString().slice(0, 10);

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
    console.error(err);
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
      const key = d.toISOString().slice(0, 10);
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
    console.error(err);
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

exports.getCalendar = async (req, res) => {
  try {
    const userId = getUserId(req);
    const workouts = await Workout.find({ user: userId }).sort({ date: 1 });

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 29);

    const counts = {};
    workouts.forEach(w => {
      const d = new Date(w.date);
      if (d < start || d > today) return;
      const key = d.toISOString().slice(0, 10);
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
      else if (count <= 3) intensity = 2;
      else if (count > 3) intensity = 3;

      days.push({
        label: key,
        short: d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
        intensity,
        hasWorkout: count > 0,
        isToday: key === today.toISOString().slice(0, 10)
      });
    }

    res.render('workouts/calendar', {
      days,
      currentPath: '/workouts/calendar'
    });
  } catch (err) {
    console.error(err);
    res.render('workouts/calendar', {
      days: [],
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
    console.error(err);
    res.redirect('/workouts/calendar');
  }
};