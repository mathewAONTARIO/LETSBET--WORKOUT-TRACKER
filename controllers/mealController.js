const mongoose = require('mongoose');
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

function ymd(d) {
  const x = startOfDay(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function toDateOrToday(value) {
  if (!value) return new Date();

  if (value instanceof Date && !isNaN(value)) return value;

  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return isNaN(dt) ? new Date() : dt;
    }
    const dt = new Date(value);
    return isNaN(dt) ? new Date() : dt;
  }

  const dt = new Date(value);
  return isNaN(dt) ? new Date() : dt;
}

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function listMeals(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const scope = String(req.query.scope || '').toLowerCase(); // 'all' or ''
    const isAll = scope === 'all';

    const selected = isAll ? startOfDay(new Date()) : startOfDay(toDateOrToday(req.query.date));
    const next = addDays(selected, 1);
    const selectedDateKey = ymd(selected);

    const query = isAll
      ? { user: userId }
      : { user: userId, date: { $gte: selected, $lt: next } };

    const meals = await Meal.find(query).sort({ date: -1 });

    const totalCalories = meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);

    res.render('meals/list', {
      meals,
      todayCalories: totalCalories, // keep variable name so your EJS doesn't break
      currentPath: '/meals',
      scope: isAll ? 'all' : 'day',
      selectedDateKey
    });
  } catch (err) {
    console.error('listMeals error:', err);
    res.render('meals/list', {
      meals: [],
      todayCalories: 0,
      currentPath: '/meals',
      scope: 'day',
      selectedDateKey: ymd(new Date())
    });
  }
}

async function exportMealsCsv(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).send('Unauthorized');

    const meals = await Meal.find({ user: userId }).sort({ date: -1 }).lean();

    const headers = ['date', 'timeOfDay', 'name', 'calories', 'protein', 'carbs', 'fats', 'notes'];

    const lines = [];
    lines.push(headers.join(','));

    meals.forEach(m => {
      const row = [
        m.date ? new Date(m.date).toISOString().slice(0, 10) : '',
        m.timeOfDay || '',
        m.name || '',
        m.calories ?? '',
        m.protein ?? '',
        m.carbs ?? '',
        m.fats ?? '',
        m.notes || ''
      ].map(csvEscape);

      lines.push(row.join(','));
    });

    const csv = lines.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="meals.csv"');
    res.status(200).send(csv);
  } catch (err) {
    console.error('exportMealsCsv error:', err);
    res.status(500).send('Error');
  }
}

function showNewForm(req, res) {
  const userId = getUserId(req);
  if (!userId) return res.redirect('/auth/login');

  const todayStr = new Date().toISOString().slice(0, 10);

  res.render('meals/new', {
    currentPath: '/meals/new',
    today: todayStr,
    formAction: '/meals/new',
    duplicateOf: null
  });
}

async function createMeal(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const { name, calories, protein, carbs, fats, timeOfDay, date, notes } = req.body;

    await Meal.create({
      name,
      calories: calories ? Number(calories) : 0,
      protein: protein ? Number(protein) : 0,
      carbs: carbs ? Number(carbs) : 0,
      fats: fats ? Number(fats) : 0,
      timeOfDay,
      date: toDateOrToday(date),
      notes,
      user: userId
    });

    res.redirect('/meals?toast=meal-saved&type=success');
  } catch (err) {
    console.error('createMeal error:', err);
    res.redirect('/meals?toast=error&type=error');
  }
}

async function duplicateMeal(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.redirect('/meals?toast=error&type=error');
    }

    const original = await Meal.findOne({ _id: id, user: userId }).lean();
    if (!original) return res.redirect('/meals?toast=error&type=error');

    const todayStr = new Date().toISOString().slice(0, 10);

    res.render('meals/new', {
      currentPath: '/meals/new',
      today: todayStr,
      formAction: '/meals/new',
      duplicateOf: original
    });
  } catch (err) {
    console.error('duplicateMeal error:', err);
    res.redirect('/meals?toast=error&type=error');
  }
}

async function showEditForm(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const meal = await Meal.findOne({ _id: req.params.id, user: userId });
    if (!meal) return res.redirect('/meals');

    res.render('meals/edit', {
      meal,
      currentPath: '/meals',
      formAction: `/meals/${meal._id}/edit`
    });
  } catch (err) {
    console.error('showEditForm error:', err);
    res.redirect('/meals');
  }
}

async function updateMeal(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const { name, calories, protein, carbs, fats, timeOfDay, date, notes } = req.body;

    await Meal.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      {
        name,
        calories: calories ? Number(calories) : 0,
        protein: protein ? Number(protein) : 0,
        carbs: carbs ? Number(carbs) : 0,
        fats: fats ? Number(fats) : 0,
        timeOfDay,
        date: toDateOrToday(date),
        notes
      }
    );

    res.redirect('/meals?toast=meal-saved&type=success');
  } catch (err) {
    console.error('updateMeal error:', err);
    res.redirect('/meals?toast=error&type=error');
  }
}

async function showDeleteConfirm(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.redirect('/meals?toast=error&type=error');
    }

    const meal = await Meal.findOne({ _id: id, user: userId });
    if (!meal) return res.redirect('/meals');

    res.render('meals/delete', {
      meal,
      currentPath: '/meals'
    });
  } catch (err) {
    console.error('showDeleteConfirm error:', err);
    res.redirect('/meals');
  }
}

async function deleteMeal(req, res) {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) return res.redirect('/auth/login');

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.redirect('/meals?toast=error&type=error');
    }

    await Meal.findOneAndDelete({ _id: id, user: userId });

    res.redirect('/meals?toast=meal-deleted&type=success');
  } catch (err) {
    console.error('deleteMeal error:', err);
    res.redirect('/meals?toast=error&type=error');
  }
}

module.exports = {
  listMeals,
  exportMealsCsv,
  showNewForm,
  createMeal,
  duplicateMeal,
  showEditForm,
  updateMeal,
  showDeleteConfirm,
  deleteMeal
};