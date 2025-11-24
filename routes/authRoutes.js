const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /auth/login
router.get('/login', (req, res) => {
  res.render('auth/login', { error: null });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.render('auth/login', {
        error: 'Invalid email or password.',
      });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.render('auth/login', {
        error: 'Invalid email or password.',
      });
    }

    req.session.userId = user._id;
    res.redirect('/workouts');
  } catch (err) {
    console.error('Login error:', err);
    res.render('auth/login', {
      error: 'Something went wrong. Try again.',
    });
  }
});

// GET /auth/register
router.get('/register', (req, res) => {
  res.render('auth/register', { error: null });
});

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, displayName, password } = req.body;

  try {
    const normalizedEmail = (email || '').toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.render('auth/register', {
        error: 'An account with that email already exists.',
      });
    }

    const user = new User({
      email: normalizedEmail,
      displayName: (displayName || '').trim(),
    });

    // This calls the virtual and sets passwordHash
    user.password = password;

    await user.save();

    req.session.userId = user._id;
    res.redirect('/workouts');
  } catch (err) {
    console.error('Register error:', err);
    res.render('auth/register', {
      error: 'Something went wrong. Try again.',
    });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
});

module.exports = router;