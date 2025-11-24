// routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const User = require('../models/User');
const Workout = require('../models/Workout');

// GET /account  → renders the Settings page
router.get('/', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    res.render('workouts/settings', {
      currentPath: '/workouts/settings',
      user
    });
  } catch (err) {
    console.error('settings page error:', err);
    res.status(500).send('Error loading settings');
  }
});

// POST /account/profile  → update profile info
router.post('/profile', requireLogin, async (req, res) => {
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
      experience
    } = req.body;

    const updates = {};

    if (displayName && displayName.trim().length > 0) {
      updates.displayName = displayName.trim();
    }

    if (weeklyGoal) {
      updates.weeklyGoal = Number(weeklyGoal) || 4;
    }

    if (gender) {
      updates.gender = gender;
    }

    if (age) {
      const ageNum = Number(age);
      if (!Number.isNaN(ageNum)) {
        updates.age = ageNum;
      }
    }

    // Height: store canonical as cm
    if (heightValue) {
      const hv = Number(heightValue);
      if (!Number.isNaN(hv)) {
        if (heightUnit === 'ft') {
          updates.heightCm = Math.round(hv * 30.48); // convert ft → cm
          updates.heightUnit = 'ft';
        } else {
          updates.heightCm = hv;
          updates.heightUnit = 'cm';
        }
      }
    }

    // Weight: store canonical as kg
    if (weightValue) {
      const wv = Number(weightValue);
      if (!Number.isNaN(wv)) {
        if (weightUnit === 'lb') {
          updates.weightKg = +(wv * 0.453592).toFixed(1); // lb → kg
          updates.weightUnit = 'lb';
        } else {
          updates.weightKg = wv;
          updates.weightUnit = 'kg';
        }
      }
    }

    if (primaryGoal) {
      updates.primaryGoal = primaryGoal;
    }

    if (experience) {
      updates.experience = experience;
    }

    await User.findByIdAndUpdate(req.session.userId, updates);
    res.redirect('/workouts/settings');
  } catch (err) {
    console.error('update profile error:', err);
    res.redirect('/workouts/settings');
  }
});

// POST /account/theme  → save dark/light preference
router.post('/theme', requireLogin, async (req, res) => {
  try {
    const theme = req.body.theme === 'light' ? 'light' : 'dark';
    await User.findByIdAndUpdate(req.session.userId, { theme });
    req.session.theme = theme;
    res.redirect('back');
  } catch (err) {
    console.error('theme update error:', err);
    res.redirect('/workouts/settings');
  }
});

// POST /account/reminders  → save workout reminder preference
router.post('/reminders', requireLogin, async (req, res) => {
  try {
    const enabled = !!req.body.reminderEnabled;
    const reminderTime = req.body.reminderTime || null;

    await User.findByIdAndUpdate(req.session.userId, {
      reminderEnabled: enabled,
      reminderTime
    });

    res.redirect('/workouts/settings');
  } catch (err) {
    console.error('reminder update error:', err);
    res.redirect('/workouts/settings');
  }
});

// POST /account/avatar  → placeholder avatar handler (no real upload yet)
router.post('/avatar', requireLogin, async (req, res) => {
  try {
    // In the future you could process an uploaded file here.
    // For now we just redirect back.
    res.redirect('/workouts/settings');
  } catch (err) {
    console.error('avatar upload error:', err);
    res.redirect('/workouts/settings');
  }
});

// POST /account/delete  → delete user + workouts
router.post('/delete', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;

    await Workout.deleteMany({ user: userId });
    await User.deleteOne({ _id: userId });

    req.session.destroy(() => {
      res.redirect('/auth/register');
    });
  } catch (err) {
    console.error('delete account error:', err);
    res.redirect('/workouts/settings');
  }
});

module.exports = router;