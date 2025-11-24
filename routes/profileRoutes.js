// routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const User = require('../models/User');
const Workout = require('../models/Workout');

// GET /account (can just redirect to settings page)
router.get('/', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).lean();
    if (!user) {
      req.session.destroy(() => {});
      return res.redirect('/auth/login');
    }
    // You have both /account and /workouts/settings – you can choose what you want here.
    return res.render('workouts/account', {
      currentPath: '/workouts/settings',
      user
    });
  } catch (err) {
    console.error('GET /account error:', err);
    return res.redirect('/auth/login');
  }
});

// UPDATE PROFILE: display name, weekly goal, body info, goals, experience
router.post('/profile', requireLogin, async (req, res) => {
  try {
    const {
      displayName,
      weeklyGoal,
      gender,
      age,
      heightCm,
      weightValue,
      weightUnit,
      primaryGoal,
      trainingExperience
    } = req.body;

    const update = {};

    if (displayName !== undefined) {
      update.displayName = displayName.trim();
    }

    const goalNum = Number(weeklyGoal);
    if (!Number.isNaN(goalNum) && goalNum > 0 && goalNum <= 14) {
      update.weeklyGoal = goalNum;
    }

    if (gender) {
      update.gender = gender;
    }

    const ageNum = Number(age);
    if (!Number.isNaN(ageNum) && ageNum > 0 && ageNum < 120) {
      update.age = ageNum;
    }

    const hNum = Number(heightCm);
    if (!Number.isNaN(hNum) && hNum > 0) {
      update.heightCm = hNum;
    }

    // Weight & unit (store in kg, remember preference)
    const wNum = Number(weightValue);
    const unit = weightUnit === 'lb' ? 'lb' : 'kg';
    if (!Number.isNaN(wNum) && wNum > 0) {
      update.weightKg = unit === 'lb' ? wNum * 0.45359237 : wNum;
    }
    update.preferredWeightUnit = unit;

    if (primaryGoal) {
      update.primaryGoal = primaryGoal;
    }

    if (trainingExperience) {
      update.trainingExperience = trainingExperience;
    }

    await User.findByIdAndUpdate(req.session.userId, update);
    res.redirect('/workouts/settings');
  } catch (err) {
    console.error('POST /account/profile error:', err);
    res.redirect('/workouts/settings');
  }
});

// THEME TOGGLE
router.post('/theme', requireLogin, async (req, res) => {
  try {
    const theme = req.body.theme === 'light' ? 'light' : 'dark';
    await User.findByIdAndUpdate(req.session.userId, { theme });
    req.session.theme = theme;
    res.redirect('/workouts/settings');
  } catch (err) {
    console.error('POST /account/theme error:', err);
    res.redirect('/workouts/settings');
  }
});

// REMINDER SETTINGS
router.post('/reminders', requireLogin, async (req, res) => {
  try {
    const reminderEnabled = req.body.reminderEnabled === 'on';
    let reminderTime = req.body.reminderTime || '18:00';

    // Very light validation: expect "HH:MM"
    if (!/^\d{2}:\d{2}$/.test(reminderTime)) {
      reminderTime = '18:00';
    }

    await User.findByIdAndUpdate(req.session.userId, {
      reminderEnabled,
      reminderTime
    });

    res.redirect('/workouts/settings');
  } catch (err) {
    console.error('POST /account/reminders error:', err);
    res.redirect('/workouts/settings');
  }
});

// OPTIONAL: profile photo upload (no-op for now, so it doesn't crash)
router.post('/photo', requireLogin, async (req, res) => {
  // You can plug in multer / cloud storage later.
  res.redirect('/workouts/settings');
});

// DELETE ACCOUNT + WORKOUTS
router.post('/delete', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;

    await Workout.deleteMany({ userId });
    await User.findByIdAndDelete(userId);

    req.session.destroy(() => {
      res.redirect('/auth/register');
    });
  } catch (err) {
    console.error('POST /account/delete error:', err);
    res.redirect('/workouts/settings');
  }
});

module.exports = router;