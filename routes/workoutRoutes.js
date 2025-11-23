const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, workoutController.getWorkouts);
router.get('/new', requireLogin, workoutController.showNewForm);
router.post('/', requireLogin, workoutController.createWorkout);

router.get('/streak', requireLogin, workoutController.getStreak);
router.get('/stats', requireLogin, workoutController.getStats);
router.get('/calendar', requireLogin, workoutController.getCalendar);
router.get('/day/:date', requireLogin, workoutController.getDaySummary);

router.get('/settings', requireLogin, (req, res) => {
  res.render('workouts/settings', { currentPath: '/workouts/settings' });
});

router.post('/:id/duplicate', requireLogin, workoutController.duplicateWorkout);
router.get('/:id/edit', requireLogin, workoutController.showEditForm);
router.post('/:id/edit', requireLogin, workoutController.updateWorkout);
router.get('/:id/delete', requireLogin, workoutController.showDeleteConfirm);
router.post('/:id/delete', requireLogin, workoutController.deleteWorkout);

module.exports = router;