const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const User = require('../models/User');
const Workout = require('../models/Workout');

// Show account/settings info if you ever hit /account directly
router.get('/', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).lean();
    res.render('workouts/account', {
      currentPath: '/workouts/settings',
      user
    });
  } catch (err) {
    console.error('account page error:', err);
    res.redirect('/workouts');
  }
});

/**
 * Update profile core fields from the Settings page
 * (display name, weekly goal, gender, age, height, weight, goals, experience)
 */
router.post('/', requireLogin, async (req, res) => {
  try {
    const {
      displayName,
      weeklyGoal,

      gender,
      age,
      heightValue,
      heightUnit,
      weightValue,
      weightUnit,
      primaryGoal,
      trainingExperience
    } = req.body;

    await User.findByIdAndUpdate(req.session.userId, {
      displayName: displayName || '',
      weeklyGoal: Number(weeklyGoal) || 4,

      gender: gender || '',
      age: age ? Number(age) : undefined,
      heightValue: heightValue ? Number(heightValue) : undefined,
      heightUnit: heightUnit === 'ft' ? 'ft' : 'cm',
      weightValue: weightValue ? Number(weightValue) : undefined,
      weightUnit: weightUnit === 'lb' ? 'lb' : 'kg',
      primaryGoal: primaryGoal || '',
      trainingExperience: trainingExperience || ''
    });

    res.redirect('/workouts/settings');
  } catch (err) {
    console.error('update profile error:', err);
    res.redirect('/workouts/settings');
  }
});

/**
 * Theme toggle – stores the user’s choice in the session
 * (used by header.ejs to pick dark vs light CSS)
 */
router.post('/theme', requireLogin, (req, res) => {
  const theme = req.body.theme === 'light' ? 'light' : 'dark';
  req.session.theme = theme;
  res.redirect('/workouts/settings');
});

/**
 * Separate endpoint if you ever change weekly goal alone
 */
router.post('/goal', requireLogin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.session.userId, {
      weeklyGoal: Number(req.body.weeklyGoal) || 4
    });
    res.redirect('/workouts/settings');
  } catch (err) {
    console.error('update goal error:', err);
    res.redirect('/workouts/settings');
  }
});

/**
 * Workout reminder prefs
 */
router.post('/reminders', requireLogin, async (req, res) => {
  try {
    const enabled = req.body.reminderEnabled === 'on';
    const reminderTime = req.body.reminderTime || '18:00';

    await User.findByIdAndUpdate(req.session.userId, {
      reminderEnabled: enabled,
      reminderTime
    });

    res.redirect('/workouts/settings');
  } catch (err) {
    console.error('update reminders error:', err);
    res.redirect('/workouts/settings');
  }
});

/**
 * Danger zone – delete account + all workouts
 */
router.post('/delete', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;

    await Workout.deleteMany({ user: userId });
    await User.findByIdAndDelete(userId);

    req.session.destroy(() => {
      res.redirect('/auth/login');
    });
  } catch (err) {
    console.error('delete account error:', err);
    res.redirect('/workouts/settings');
  }
});

module.exports = router;