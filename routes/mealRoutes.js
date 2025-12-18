const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const {
  listMeals,
  exportMealsCsv,
  showNewForm,
  createMeal,
  showEditForm,
  updateMeal,
  showDeleteConfirm,
  deleteMeal,
  duplicateMeal
} = require('../controllers/mealController');

router.get('/', requireLogin, listMeals);
router.get('/export.csv', requireLogin, exportMealsCsv);

router.get('/new', requireLogin, showNewForm);
router.post('/new', requireLogin, createMeal);

router.get('/:id/duplicate', requireLogin, duplicateMeal);

router.get('/:id/edit', requireLogin, showEditForm);
router.post('/:id/edit', requireLogin, updateMeal);

router.get('/:id/delete', requireLogin, showDeleteConfirm);
router.post('/:id/delete', requireLogin, deleteMeal);

module.exports = router;