// controllers/insightsController.js
const Workout = require('../models/Workout');
const Meal = require('../models/Meal');

function getUserId(req) {
  return req.session && req.session.userId;
}

function toDateOrToday(value) {
  if (!value) return new Date();

  if (value instanceof Date && !isNaN(value)) return value;

  if (typeof value === 'string') {
    // accepts YYYY-MM-DD
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

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDayExclusive(d) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Monday-start week
function startOfWeekMonday(date) {
  const d = startOfDay(date);
  const day = d.getDay(); // 0=Sun ... 6=Sat
  const diff = (day === 0 ? -6 : 1 - day); // if Sunday, go back 6
  d.setDate(d.getDate() + diff);
  return d;
}

exports.getDaySummary = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const picked = toDateOrToday(req.params.date);
    const dayStart = startOfDay(picked);
    const dayEnd = endOfDayExclusive(picked);

    const [workouts, meals] = await Promise.all([
      Workout.find({ user: userId, date: { $gte: dayStart, $lt: dayEnd } }).sort({ date: -1 }).lean(),
      Meal.find({ user: userId, date: { $gte: dayStart, $lt: dayEnd } }).sort({ date: -1 }).lean()
    ]);

    const totals = meals.reduce(
      (acc, m) => {
        acc.calories += Number(m.calories) || 0;
        acc.protein += Number(m.protein) || 0;
        acc.carbs += Number(m.carbs) || 0;
        acc.fats += Number(m.fats) || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    const totalWorkouts = workouts.length;
    const totalMeals = meals.length;

    // simple volume estimate (optional)
    const totalVolume = workouts.reduce((sum, w) => {
      const sets = Number(w.sets) || 0;
      const reps = Number(w.reps) || 0;
      const weight = Number(w.weight) || 0;
      return sum + sets * reps * weight;
    }, 0);

    res.render('insights/day', {
      currentPath: '/day',
      dateLabel: ymd(dayStart),
      workouts,
      meals,
      totals,
      totalWorkouts,
      totalMeals,
      totalVolume
    });
  } catch (err) {
    console.error('getDaySummary error:', err);
    return res.redirect('/workouts');
  }
};

exports.getWeekOverview = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    // optional: /week?start=YYYY-MM-DD (must be a Monday ideally, but we’ll normalize)
    const startParam = typeof req.query.start === 'string' ? req.query.start : '';
    const base = startParam ? toDateOrToday(startParam) : new Date();

    const weekStart = startOfWeekMonday(base);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [workouts, meals] = await Promise.all([
      Workout.find({ user: userId, date: { $gte: weekStart, $lt: weekEnd } }).lean(),
      Meal.find({ user: userId, date: { $gte: weekStart, $lt: weekEnd } }).lean()
    ]);

    const totalWorkouts = workouts.length;

    const totals = meals.reduce(
      (acc, m) => {
        acc.calories += Number(m.calories) || 0;
        acc.protein += Number(m.protein) || 0;
        acc.carbs += Number(m.carbs) || 0;
        acc.fats += Number(m.fats) || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    // days-with-data (for better averages)
    const mealDays = new Set();
    meals.forEach(m => {
      if (!m.date) return;
      mealDays.add(ymd(startOfDay(new Date(m.date))));
    });

    const avgCalories = totals.calories / 7;
    const avgProtein = totals.protein / 7;

    res.render('insights/week', {
      currentPath: '/week',
      weekStart: ymd(weekStart),
      weekEnd: ymd(new Date(weekEnd.getTime() - 1)), // just for display
      totalWorkouts,
      totals,
      avgCalories,
      avgProtein,
      mealDaysCount: mealDays.size
    });
  } catch (err) {
    console.error('getWeekOverview error:', err);
    return res.redirect('/workouts');
  }
}; 