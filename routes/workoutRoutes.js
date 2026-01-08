const express = require('express');
const router = express.Router();

const workoutController = require('../controllers/workoutController');
const { requireLogin } = require('../middleware/auth');

// QUICK LOG
router.get('/quick', requireLogin, workoutController.showQuickLog);
router.post('/quick', requireLogin, workoutController.createQuickLog);

// STREAK / STATS / LIBRARY / CALENDAR
router.get('/streak', requireLogin, workoutController.getStreak);
router.get('/stats', requireLogin, workoutController.getStats);
router.get('/stats/prs', requireLogin, workoutController.getPRs);
router.get('/library', requireLogin, workoutController.getLibrary);

router.get('/calendar', requireLogin, workoutController.getCalendar);
router.get('/day/:date', requireLogin, workoutController.getDaySummary);

// NEW WORKOUT
router.get('/new', requireLogin, workoutController.showNewForm);
router.post('/new', requireLogin, workoutController.createWorkout);

router.get('/day/:date/new', requireLogin, workoutController.showNewFormForDate);
router.post('/day/:date/new', requireLogin, workoutController.createWorkoutForDate);

// ✅ TOGGLE COMPLETE (must be before :id/edit etc.)
router.post('/:id/toggle', requireLogin, workoutController.toggleComplete);

// DUPLICATE (support BOTH GET + POST so your UI can be either)
router.get('/:id/duplicate', requireLogin, workoutController.duplicateWorkout);
router.post('/:id/duplicate', requireLogin, workoutController.duplicateWorkout);

// EDIT / UPDATE
router.get('/:id/edit', requireLogin, workoutController.showEditForm);
router.post('/:id/edit', requireLogin, workoutController.updateWorkout);

// DELETE
router.get('/:id/delete', requireLogin, workoutController.showDeleteConfirm);
router.post('/:id/delete', requireLogin, workoutController.deleteWorkout);

// LIST (default)
router.get('/', requireLogin, workoutController.getWorkouts);

module.exports = router;