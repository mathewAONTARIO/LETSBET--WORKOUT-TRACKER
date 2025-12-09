// routes/mealRoutes.js
const express = require('express');
const router = express.Router();
const {
  listMeals,
  showNewForm,
  createMeal,
  showEditForm,
  updateMeal,
  deleteMeal
} = require('../controllers/mealController');

router.get('/', listMeals);

router.get('/new', showNewForm);
router.post('/new', createMeal);

router.get('/:id/edit', showEditForm);
router.post('/:id/edit', updateMeal);

router.post('/:id/delete', deleteMeal);

module.exports = router;