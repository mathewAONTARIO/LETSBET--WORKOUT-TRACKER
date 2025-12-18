// routes/mealRoutes.js
const express = require('express');
const router = express.Router();
const {
  listMeals,
  showNewForm,
  createMeal,
  showEditForm,
  updateMeal,
  showDeleteConfirm,
  deleteMeal,
  duplicateMeal
} = require('../controllers/mealController');

router.get('/', listMeals);

// NEW
router.get('/new', showNewForm);
router.post('/new', createMeal);

// DUPLICATE (pre-fills the /new form)
router.get('/:id/duplicate', duplicateMeal);

// EDIT
router.get('/:id/edit', showEditForm);
router.post('/:id/edit', updateMeal);

// DELETE confirm page + actual delete
router.get('/:id/delete', showDeleteConfirm);
router.post('/:id/delete', deleteMeal);

module.exports = router;