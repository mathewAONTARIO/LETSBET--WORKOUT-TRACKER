const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');
const { requireLogin } = require('../middleware/auth');
const User = require('../models/User');

router.get('/', requireLogin, workoutController.getWorkouts);
router.get('/new', requireLogin, workoutController.showNewForm);
router.post('/', requireLogin, workoutController.createWorkout);

router.get('/streak', requireLogin, workoutController.getStreak);
router.get('/stats', requireLogin, workoutController.getStats);
router.get('/prs', requireLogin, workoutController.getPRs);
router.get('/library', requireLogin, workoutController.getLibrary);

router.get('/calendar', requireLogin, workoutController.getCalendar);
router.get('/day/:date', requireLogin, workoutController.getDaySummary);

router.get('/settings', requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId).lean();

  res.render('workouts/settings', {
    currentPath: '/workouts/settings',
    user
  });
});

router.post('/:id/duplicate', requireLogin, workoutController.duplicateWorkout);
router.get('/:id/edit', requireLogin, workoutController.showEditForm);
router.post('/:id/edit', requireLogin, workoutController.updateWorkout);
router.get('/:id/delete', requireLogin, workoutController.showDeleteConfirm);
router.post('/:id/delete', requireLogin, workoutController.deleteWorkout);

module.exports = router;