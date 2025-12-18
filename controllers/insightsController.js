const Workout = require('../models/Workout');
const Meal = require('../models/Meal');

function getUserId(req) {
  return req.session && req.session.userId;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

exports.getInsights = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.redirect('/auth/login');

  const today = startOfDay(new Date());
  const from7 = startOfDay(addDays(today, -6));
  const tomorrow = startOfDay(addDays(today, 1));

  const meals = await Meal.find({
    user: userId,
    date: { $gte: from7, $lt: tomorrow }
  }).select('date calories').lean();

  const workouts = await Workout.find({
    user: userId,
    date: { $gte: from7, $lt: tomorrow }
  }).select('date isPR').lean();

  const labels = [];
  const cals = [];
  const workoutCounts = [];
  const prCounts = [];

  for (let i = 0; i < 7; i++) {
    const day = startOfDay(addDays(from7, i));
    const next = startOfDay(addDays(day, 1));
    const key = day.toISOString().slice(0, 10);

    const dayMeals = meals.filter(m => m.date && new Date(m.date) >= day && new Date(m.date) < next);
    const dayWorkouts = workouts.filter(w => w.date && new Date(w.date) >= day && new Date(w.date) < next);

    labels.push(key);
    cals.push(dayMeals.reduce((s, m) => s + (Number(m.calories) || 0), 0));
    workoutCounts.push(dayWorkouts.length);
    prCounts.push(dayWorkouts.filter(w => w.isPR).length);
  }

  const total7Cal = cals.reduce((a, b) => a + b, 0);
  const avg7Cal = Math.round(total7Cal / 7);

  res.render('insights/index', {
    currentPath: '/insights',
    labels: JSON.stringify(labels),
    calories: JSON.stringify(cals),
    workouts: JSON.stringify(workoutCounts),
    prs: JSON.stringify(prCounts),
    avg7Cal,
    total7Cal
  });
};