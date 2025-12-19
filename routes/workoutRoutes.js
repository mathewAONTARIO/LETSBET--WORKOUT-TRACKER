const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, workoutController.getWorkouts);
router.get('/new', requireLogin, workoutController.showNewForm);
router.post('/new', requireLogin, workoutController.createWorkout);

router.get('/streak', requireLogin, workoutController.getStreak);
router.get('/stats', requireLogin, workoutController.getStats);
router.get('/stats/prs', requireLogin, workoutController.getPRs);
router.get('/library', requireLogin, workoutController.getLibrary);
router.get('/calendar', requireLogin, workoutController.getCalendar);

router.get('/day/:date', requireLogin, workoutController.getDaySummary);
router.get('/day/:date/new', requireLogin, workoutController.showNewFormForDate);
router.post('/day/:date/new', requireLogin, workoutController.createWorkoutForDate);

router.post('/:id/duplicate', requireLogin, workoutController.duplicateWorkout);
router.get('/:id/edit', requireLogin, workoutController.showEditForm);
router.post('/:id/edit', requireLogin, workoutController.updateWorkout);
router.get('/:id/delete', requireLogin, workoutController.showDeleteConfirm);
router.post('/:id/delete', requireLogin, workoutController.deleteWorkout);

module.exports = router;