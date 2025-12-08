// routes/mealRoutes.js
const express = require('express');
const router = express.Router();
const mealController = require('../controllers/mealController');

// /meals
router.get('/', mealController.getMeals);

// /meals/new
router.get('/new', mealController.showNewMealForm);
router.post('/new', mealController.createMeal);

// /meals/:id/delete
router.post('/:id/delete', mealController.deleteMeal);

module.exports = router;