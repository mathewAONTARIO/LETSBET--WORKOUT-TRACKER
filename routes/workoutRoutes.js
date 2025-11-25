// routes/workoutRoutes.js
const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');

/* ---------- MAIN LIST ---------- */

// GET /workouts
router.get('/', workoutController.getWorkouts);

/* ---------- CREATE (NORMAL) ---------- */

// GET /workouts/new  (show blank form for today)
router.get('/new', workoutController.showNewForm);

// POST /workouts/new  (create workout with chosen date)
router.post('/new', workoutController.createWorkout);

/* ---------- CREATE FOR SPECIFIC DAY (FROM CALENDAR) ---------- */

// GET /workouts/day/2025-11-26/new  (show form pre-filled with that date)
router.get('/day/:date/new', workoutController.showNewFormForDate);

// POST /workouts/day/2025-11-26/new  (submit form for that same date)
router.post('/day/:date/new', workoutController.createWorkoutForDate);

/* ---------- DAY SUMMARY (CALENDAR) ---------- */

// GET /workouts/day/2025-11-26
router.get('/day/:date', workoutController.getDaySummary);

/* ---------- STREAK / STATS / PRS / LIBRARY / CALENDAR / SETTINGS ---------- */

// GET /workouts/streak
router.get('/streak', workoutController.getStreak);

// GET /workouts/stats
router.get('/stats', workoutController.getStats);

// PRs – make both URLs work:
//   /workouts/stats/prs   (your current one)
//   /workouts/prs         (shortcut if you ever link to it)
router.get('/stats/prs', workoutController.getPRs);
router.get('/prs', workoutController.getPRs);

// GET /workouts/library
router.get('/library', workoutController.getLibrary);

// GET /workouts/calendar
router.get('/calendar', workoutController.getCalendar);

// GET /workouts/settings  (simple settings page)
router.get('/settings', (req, res) => {
  res.render('workouts/settings', { currentPath: '/workouts/settings' });
});

/* ---------- DUPLICATE / EDIT / DELETE ---------- */

// GET /workouts/:id/duplicate
router.get('/:id/duplicate', workoutController.duplicateWorkout);

// GET /workouts/:id/edit
router.get('/:id/edit', workoutController.showEditForm);

// POST /workouts/:id/edit
router.post('/:id/edit', workoutController.updateWorkout);

// GET /workouts/:id/delete (confirm page)
router.get('/:id/delete', workoutController.showDeleteConfirm);

// POST /workouts/:id/delete (actually delete)
router.post('/:id/delete', workoutController.deleteWorkout);

module.exports = router;