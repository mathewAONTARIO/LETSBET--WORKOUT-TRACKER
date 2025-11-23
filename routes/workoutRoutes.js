const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');

router.get('/', workoutController.getWorkouts);
router.get('/new', workoutController.showNewForm);
router.post('/', workoutController.createWorkout);

router.get('/streak', workoutController.getStreak);
router.get('/stats', workoutController.getStats);
router.get('/calendar', workoutController.getCalendar);
router.get('/day/:date', workoutController.getDaySummary);
router.get('/settings', (req, res) => res.render('workouts/settings'));

router.post('/:id/duplicate', workoutController.duplicateWorkout);
router.get('/:id/edit', workoutController.showEditForm);
router.post('/:id/edit', workoutController.updateWorkout);
router.get('/:id/delete', workoutController.showDeleteConfirm);
router.post('/:id/delete', workoutController.deleteWorkout);

module.exports = router;