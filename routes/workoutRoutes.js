// routes/workoutRoutes.js
const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');
const { requireAuth } = require('../middleware/auth');

// list
router.get('/', requireAuth, workoutController.getWorkouts);

// new
router.get('/new', requireAuth, workoutController.showNewForm);
router.post('/new', requireAuth, workoutController.createWorkout);

// edit
router.get('/:id/edit', requireAuth, workoutController.showEditForm);
router.post('/:id/edit', requireAuth, workoutController.updateWorkout);

// duplicate
router.post('/:id/duplicate', requireAuth, workoutController.duplicateWorkout);

// optional confirm page (not used right now, but kept safe)
router.get('/:id/delete/confirm', requireAuth, workoutController.showDeleteConfirm);

// actual delete – this is what the button in list.ejs posts to
router.post('/:id/delete', requireAuth, workoutController.deleteWorkout);

// streak + stats + prs
router.get('/streak/overview', requireAuth, workoutController.getStreak);
router.get('/stats', requireAuth, workoutController.getStats);
router.get('/stats/prs', requireAuth, workoutController.getPRs);

// library
router.get('/library', requireAuth, workoutController.getLibrary);

// calendar
router.get('/calendar', requireAuth, workoutController.getCalendar);
router.get('/day/:date', requireAuth, workoutController.getDaySummary);

module.exports = router;