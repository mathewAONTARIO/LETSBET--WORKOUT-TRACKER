// controllers/mealController.js
const mongoose = require('mongoose');
const Meal = require('../models/Meal');

function getUserId(req) {
  return req.session && req.session.userId;
}

/* ---------- LIST ---------- */

exports.getMeals = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const meals = await Meal.find({ user: userId }).sort({ date: -1 });

    // simple daily total for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysMeals = meals.filter(m => {
      const d = new Date(m.date);
      return d >= today && d < tomorrow;
    });

    const todayTotalCalories = todaysMeals.reduce(
      (sum, m) => sum + (m.calories || 0),
      0
    );

    res.render('meals/list', {
      meals,
      todayTotalCalories,
      currentPath: '/meals'
    });
  } catch (err) {
    console.error('getMeals error:', err);
    res.render('meals/list', {
      meals: [],
      todayTotalCalories: 0,
      currentPath: '/meals'
    });
  }
};

/* ---------- CREATE ---------- */

exports.showNewMealForm = (req, res) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  res.render('meals/new', {
    currentPath: '/meals/new',
    today: todayStr
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
      date,
      timeOfDay,
      notes
    } = req.body;

    const caloriesNumber = parseInt(calories, 10) || 0;
    const proteinNumber = parseFloat(protein) || 0;
    const carbsNumber = parseFloat(carbs) || 0;
    const fatNumber = parseFloat(fats) || 0;

    await Meal.create({
      user: userId,
      name,
      calories: caloriesNumber,
      protein: proteinNumber,
      carbs: carbsNumber,
      fats: fatNumber,       // primary
      fat: fatNumber,        // keep both keys safe
      date: date || new Date(),
      timeOfDay,
      notes
    });

    res.redirect('/meals');
  } catch (err) {
    console.error('createMeal error:', err);
    res.redirect('/meals');
  }
};

/* ---------- EDIT ---------- */

exports.showEditMealForm = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.redirect('/meals');

    const meal = await Meal.findOne({ _id: id, user: userId });
    if (!meal) return res.redirect('/meals');

    res.render('meals/edit', {
      meal,
      currentPath: '/meals'
    });
  } catch (err) {
    console.error('showEditMealForm error:', err);
    res.redirect('/meals');
  }
};

exports.updateMeal = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.redirect('/auth/login');

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.redirect('/meals');

    const {
      name,
      calories,
      protein,
      carbs,
      fats,
      date,
      timeOfDay,
      notes
    } = req.body;

    const caloriesNumber = parseInt(calories, 10) || 0;
    const proteinNumber = parseFloat(protein) || 0;
    const carbsNumber = parseFloat(carbs) || 0;
    const fatNumber = parseFloat(fats) || 0;

    await Meal.findOneAndUpdate(
      { _id: id, user: userId },
      {
        name,
        calories: caloriesNumber,
        protein: proteinNumber,
        carbs: carbsNumber,
        fats: fatNumber,
        fat: fatNumber,
        date: date || new Date(),
        timeOfDay,
        notes
      }
    );

    res.redirect('/meals');
  } catch (err) {
    console.error('updateMeal error:', err);
    res.redirect('/meals');
  }
};

/* ---------- DELETE ---------- */

exports.deleteMeal = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) return res.redirect('/auth/login');
    if (!mongoose.Types.ObjectId.isValid(id)) return res.redirect('/meals');

    await Meal.findOneAndDelete({ _id: id, user: userId });
    res.redirect('/meals');
  } catch (err) {
    console.error('deleteMeal error:', err);
    res.redirect('/meals');
  }
};