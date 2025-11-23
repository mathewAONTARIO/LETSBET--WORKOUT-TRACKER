// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /auth/login
router.get('/login', (req, res) => {
  res.render('auth/login', {
    currentPath: '/auth/login',
    error: null
  });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.render('auth/login', {
        currentPath: '/auth/login',
        error: 'Invalid email or password.'
      });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.render('auth/login', {
        currentPath: '/auth/login',
        error: 'Invalid email or password.'
      });
    }

    // Login success
    req.session.userId = user._id;
    // keep theme if already set, otherwise default dark
    if (!req.session.theme) {
      req.session.theme = 'dark';
    }

    res.redirect('/');
  } catch (err) {
    console.error('Login error:', err);
    res.render('auth/login', {
      currentPath: '/auth/login',
      error: 'Something went wrong. Try again.'
    });
  }
});

// GET /auth/register
router.get('/register', (req, res) => {
  res.render('auth/register', {
    currentPath: '/auth/register',
    error: null
  });
});

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, displayName, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.render('auth/register', {
        currentPath: '/auth/register',
        error: 'An account with that email already exists.'
      });
    }

    const user = new User({
      email,
      displayName,
      password
    });

    await user.save();

    // log them in right away
    req.session.userId = user._id;
    req.session.theme = 'dark';

    res.redirect('/');
  } catch (err) {
    console.error('Register error:', err);
    res.render('auth/register', {
      currentPath: '/auth/register',
      error: 'Something went wrong. Try again.'
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