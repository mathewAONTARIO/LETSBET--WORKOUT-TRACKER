// controllers/mealController.js
const mongoose = require('mongoose');
const Meal = require('../models/Meal');

function getUserId(req) {
  return req.session && req.session.userId;
}

function toDateOrToday(value) {
  if (!value) return new Date();
  const dt = new Date(value);
  return isNaN(dt) ? new Date() : dt;
}

async function listMeals(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const meals = await Meal.find({ user: userId }).sort({ date: -1 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayMeals = meals.filter(m => {
      if (!m.date) return false;
      const d = new Date(m.date);
      return d >= today && d < tomorrow;
    });

    const todayCalories = todayMeals.reduce((sum, m) => {
      const c = Number(m.calories) || 0;
      return sum + c;
    }, 0);

    res.render('meals/list', {
      meals,
      todayCalories,
      currentPath: '/meals'
    });
  } catch (err) {
    console.error('listMeals error:', err);
    res.render('meals/list', {
      meals: [],
      todayCalories: 0,
      currentPath: '/meals'
    });
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

// ✅ DUPLICATE -> renders meals/new with duplicateOf pre-filled
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

    const meal = await Meal.findOne({
      _id: req.params.id,
      user: userId
    });

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

// ✅ DELETE confirm page (like workouts delete confirm)
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
      console.warn('deleteMeal invalid id:', id);
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
  showNewForm,
  createMeal,
  duplicateMeal,
  showEditForm,
  updateMeal,
  showDeleteConfirm,
  deleteMeal
};