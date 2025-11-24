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
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.render('auth/login', {
        currentPath: '/auth/login',
        error: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('auth/login', {
        currentPath: '/auth/login',
        error: 'Invalid email or password.'
      });
    }

    // success → save session + go home
    req.session.userId = user._id;
    res.redirect('/');
  } catch (err) {
    console.error('Login error:', err);
    return res.render('auth/login', {
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
  const { email, password, displayName } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.render('auth/register', {
        currentPath: '/auth/register',
        error: 'That email is already in use.'
      });
    }

    const user = new User({
      email,
      password,
      displayName
    });

    await user.save();

    req.session.userId = user._id;
    res.redirect('/');
  } catch (err) {
    console.error('Register error:', err);
    return res.render('auth/register', {
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