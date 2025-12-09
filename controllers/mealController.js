const mongoose = require('mongoose');
const Meal = require('../models/Meal');

function getUserId(req) {
  return req.session && req.session.userId;
}

exports.listMeals = async (req, res) => {
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

    const todayCalories = todayMeals.reduce(
      (sum, m) => sum + (m.calories || 0),
      0
    );

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
};

exports.showNewForm = (req, res) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  res.render('meals/new', {
    currentPath: '/meals',
    today: todayStr,
    formAction: '/meals/new'
  });
};

exports.createMeal = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const {
      name,
      calories,
      protein,
      carbs,
      fats,
      timeOfDay,
      date,
      notes
    } = req.body;

    await Meal.create({
      name,
      calories,
      protein,
      carbs,
      fats,
      timeOfDay,
      date,
      notes,
      user: userId
    });

    res.redirect('/meals?toast=meal-saved&type=success');
  } catch (err) {
    console.error('createMeal error:', err);
    res.redirect('/meals?toast=error&type=error');
  }
};

exports.showEditForm = async (req, res) => {
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
};

exports.updateMeal = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const {
      name,
      calories,
      protein,
      carbs,
      fats,
      timeOfDay,
      date,
      notes
    } = req.body;

    await Meal.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      {
        name,
        calories,
        protein,
        carbs,
        fats,
        timeOfDay,
        date,
        notes
      }
    );

    res.redirect('/meals?toast=meal-saved&type=success');
  } catch (err) {
    console.error('updateMeal error:', err);
    res.redirect('/meals?toast=error&type=error');
  }
};

exports.deleteMeal = async (req, res) => {
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
};