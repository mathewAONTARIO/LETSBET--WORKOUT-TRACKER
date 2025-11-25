// routes/workoutRoutes.js
const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');

/* ---------- MAIN LIST ---------- */

// /workouts
router.get('/', workoutController.getWorkouts);

/* ---------- CREATE (NORMAL) ---------- */

// /workouts/new  (show form)
router.get('/new', workoutController.showNewForm);

// /workouts/new  (handle submit)
router.post('/new', workoutController.createWorkout);

/* ---------- CREATE FOR SPECIFIC DAY (FROM CALENDAR) ---------- */

// /workouts/day/2025-11-26/new  (show form for that date)
router.get('/day/:date/new', workoutController.showNewFormForDate);

// /workouts/day/2025-11-26/new  (submit form for that date)
router.post('/day/:date/new', workoutController.createWorkoutForDate);

/* ---------- DAY SUMMARY (CALENDAR) ---------- */

// /workouts/day/2025-11-26
router.get('/day/:date', workoutController.getDaySummary);

/* ---------- STREAK / STATS / LIBRARY / CALENDAR / SETTINGS ---------- */

// /workouts/streak
router.get('/streak', workoutController.getStreak);

// /workouts/stats
router.get('/stats', workoutController.getStats);

// /workouts/stats/prs
router.get('/stats/prs', workoutController.getPRs);

// /workouts/library
router.get('/library', workoutController.getLibrary);

// /workouts/calendar
router.get('/calendar', workoutController.getCalendar);

// /workouts/settings  → simple render of settings page
router.get('/settings', (req, res) => {
  // you already have views/workouts/settings.ejs
  res.render('workouts/settings', {
    currentPath: '/workouts/settings'
  });
});

/* ---------- DUPLICATE / EDIT / DELETE ---------- */

// /workouts/:id/duplicate
router.get('/:id/duplicate', workoutController.duplicateWorkout);

// /workouts/:id/edit
router.get('/:id/edit', workoutController.showEditForm);
router.post('/:id/edit', workoutController.updateWorkout);

// /workouts/:id/delete (confirm page)
router.get('/:id/delete', workoutController.showDeleteConfirm);

// /workouts/:id/delete (form POST)
router.post('/:id/delete', workoutController.deleteWorkout);

module.exports = router;