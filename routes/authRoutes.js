const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/login', (req, res) => {
  res.render('auth/login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.render('auth/login', { error: 'Invalid email or password.' });
    }

    if (!user.password) {
      return res.render('auth/login', { error: 'Account needs a password reset. Re-register or reset your password.' });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.render('auth/login', { error: 'Invalid email or password.' });
    }

    req.session.userId = user._id;
    req.session.user = {
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      profilePhotoUrl: user.profilePhotoUrl,
      theme: user.theme,
      weeklyGoal: user.weeklyGoal,
      dailyReminderEnabled: user.dailyReminderEnabled,
      reminderTime: user.reminderTime,
      gender: user.gender,
      age: user.age,
      heightValue: user.heightValue,
      heightUnit: user.heightUnit,
      weightValue: user.weightValue,
      weightUnit: user.weightUnit,
      targetWeightValue: user.targetWeightValue,
      targetWeightUnit: user.targetWeightUnit,
      primaryGoal: user.primaryGoal,
      trainingExperience: user.trainingExperience
    };

    return res.redirect('/workouts');
  } catch (err) {
    console.error('Login error:', err);
    return res.render('auth/login', { error: 'Something went wrong. Try again.' });
  }
});

router.get('/register', (req, res) => {
  res.render('auth/register', { error: null });
});

router.post('/register', async (req, res) => {
  const { email, displayName, password } = req.body;

  try {
    const normalizedEmail = (email || '').toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.render('auth/register', { error: 'An account with that email already exists.' });
    }

    if (!password || password.length < 6) {
      return res.render('auth/register', { error: 'Password must be at least 6 characters.' });
    }

    const user = new User({
      email: normalizedEmail,
      displayName: (displayName || '').trim(),
      password
    });

    await user.save();

    req.session.userId = user._id;
    req.session.user = {
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      profilePhotoUrl: user.profilePhotoUrl,
      theme: user.theme,
      weeklyGoal: user.weeklyGoal,
      dailyReminderEnabled: user.dailyReminderEnabled,
      reminderTime: user.reminderTime
    };

    return res.redirect('/workouts');
  } catch (err) {
    console.error('Register error:', err);
    return res.render('auth/register', { error: 'Something went wrong. Try again.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
});

module.exports = router;