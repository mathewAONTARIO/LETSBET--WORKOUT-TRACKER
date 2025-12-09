const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');
const { requireLogin } = require('../middleware/auth');

// ---- STATIC ROUTES FIRST ----
router.get('/', requireLogin, workoutController.getWorkouts);
router.get('/new', requireLogin, workoutController.showNewForm);
router.post('/new', requireLogin, workoutController.createWorkout);

router.get('/streak', requireLogin, workoutController.getStreak);
router.get('/stats', requireLogin, workoutController.getStats);
router.get('/stats/prs', requireLogin, workoutController.getPRs);
router.get('/library', requireLogin, workoutController.getLibrary);
router.get('/calendar', requireLogin, workoutController.getCalendar);

// ---- DAY ROUTES (still static, BEFORE /:id) ----
router.get('/day/:date', requireLogin, workoutController.getDaySummary);
router.get('/day/:date/new', requireLogin, workoutController.showNewFormForDate);
router.post('/day/:date/new', requireLogin, workoutController.createWorkoutForDate);

// ---- NOW ID ROUTES (keep last) ----
router.post('/:id/duplicate', requireLogin, workoutController.duplicateWorkout);
router.get('/:id/edit', requireLogin, workoutController.showEditForm);
router.post('/:id/edit', requireLogin, workoutController.updateWorkout);
router.get('/:id/delete', requireLogin, workoutController.showDeleteConfirm);
router.post('/:id/delete', requireLogin, workoutController.deleteWorkout);

module.exports = router;