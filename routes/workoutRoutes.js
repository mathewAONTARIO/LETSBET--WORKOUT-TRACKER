// routes/workoutRoutes.js
const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');

// Helper so Express never gets "undefined" as a handler
function safe(name) {
  const fn = workoutController[name];
  if (typeof fn !== 'function') {
    console.error(`❌ workoutController.${name} is NOT a function. Got:`, fn);
    return (req, res) => {
      res
        .status(500)
        .send(`Handler "${name}" is not implemented on workoutController.`);
    };
  }
  return fn;
}

// MAIN LIST
router.get('/', safe('getWorkouts'));

// CREATE WORKOUT (generic)
router.get('/new', safe('showNewForm'));
router.post('/new', safe('createWorkout'));

// CREATE FOR SPECIFIC DAY
router.get('/day/:date/new', safe('showNewFormForDate'));
router.post('/day/:date/new', safe('createWorkoutForDate'));

// DAY SUMMARY
router.get('/day/:date', safe('getDaySummary'));

// STREAK + STATS
router.get('/streak', safe('getStreak'));
router.get('/stats', safe('getStats'));
router.get('/stats/prs', safe('getPRs'));

// LIBRARY + CALENDAR
router.get('/library', safe('getLibrary'));
router.get('/calendar', safe('getCalendar'));

// SIMPLE SETTINGS PAGE (no controller needed)
router.get('/settings', (req, res) => {
  res.render('workouts/settings', {
    currentPath: '/workouts/settings'
  });
});

// DUPLICATE / EDIT / DELETE
router.post('/:id/duplicate', safe('duplicateWorkout'));

router.get('/:id/edit', safe('showEditForm'));
router.post('/:id/edit', safe('updateWorkout'));

router.get('/:id/delete', safe('showDeleteConfirm'));
router.post('/:id/delete', safe('deleteWorkout'));

module.exports = router;