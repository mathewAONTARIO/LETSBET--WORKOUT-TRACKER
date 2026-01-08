const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');
const { requireLogin, requireGender } = require('../middleware/auth');

// ✅ Apply to all workout routes
const gate = [requireLogin, requireGender];

router.get('/', gate, workoutController.getWorkouts);

router.get('/quick', gate, workoutController.showQuickLog);
router.post('/quick', gate, workoutController.createQuickLog);

router.get('/new', gate, workoutController.showNewForm);
router.post('/new', gate, workoutController.createWorkout);

router.get('/streak', gate, workoutController.getStreak);
router.get('/stats', gate, workoutController.getStats);
router.get('/stats/prs', gate, workoutController.getPRs);
router.get('/library', gate, workoutController.getLibrary);
router.get('/calendar', gate, workoutController.getCalendar);

router.get('/day/:date', gate, workoutController.getDaySummary);
router.get('/day/:date/new', gate, workoutController.showNewFormForDate);
router.post('/day/:date/new', gate, workoutController.createWorkoutForDate);

router.post('/:id/duplicate', gate, workoutController.duplicateWorkout);
router.get('/:id/edit', gate, workoutController.showEditForm);
router.post('/:id/edit', gate, workoutController.updateWorkout);
router.get('/:id/delete', gate, workoutController.showDeleteConfirm);
router.post('/:id/delete', gate, workoutController.deleteWorkout);

module.exports = router;