// routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const User = require('../models/User');
const Workout = require('../models/Workout');

// Account / settings page
router.get('/', requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId).lean();

  res.render('workouts/account', {
    currentPath: '/workouts/settings',
    user
  });
});

// Update basic profile info (display name, profile photo, weekly goal)
router.post('/profile', requireLogin, async (req, res) => {
  try {
    const { displayName, profilePhotoUrl, weeklyGoal } = req.body;

    await User.findByIdAndUpdate(req.session.userId, {
      displayName: displayName || '',
      profilePhotoUrl: profilePhotoUrl || '',
      weeklyGoal: Number(weeklyGoal) || 4
    });

    res.redirect('/account');
  } catch (err) {
    console.error('update profile error:', err);
    res.redirect('/account');
  }
});

// Change theme (light / dark)
router.post('/theme', requireLogin, async (req, res) => {
  try {
    const theme = req.body.theme === 'light' ? 'light' : 'dark';

    await User.findByIdAndUpdate(req.session.userId, { theme });
    req.session.theme = theme;

    res.redirect('back');
  } catch (err) {
    console.error('update theme error:', err);
    res.redirect('/account');
  }
});

// Set workout reminders
router.post('/reminders', requireLogin, async (req, res) => {
  try {
    const reminderEnabled = req.body.reminderEnabled === 'on';
    const reminderTime = req.body.reminderTime || '18:00';

    await User.findByIdAndUpdate(req.session.userId, {
      reminderEnabled,
      reminderTime
    });

    res.redirect('/account');
  } catch (err) {
    console.error('update reminders error:', err);
    res.redirect('/account');
  }
});

// Delete account + all workouts
router.post('/delete', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;

    await Workout.deleteMany({ user: userId });
    await User.findByIdAndDelete(userId);

    req.session.destroy(() => {
      res.redirect('/');
    });
  } catch (err) {
    console.error('delete account error:', err);
    res.redirect('/account');
  }
});

module.exports = router;