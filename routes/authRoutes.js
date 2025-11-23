const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /auth/login
router.get('/login', (req, res) => {
  res.render('auth/login', {
    currentPath: '/auth/login',
    errorMessage: null
  });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).render('auth/login', {
        currentPath: '/auth/login',
        errorMessage: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).render('auth/login', {
        currentPath: '/auth/login',
        errorMessage: 'Invalid email or password.'
      });
    }

    req.session.userId = user._id;
    res.redirect('/');
  } catch (err) {
    console.error('login error:', err);
    res.status(500).render('auth/login', {
      currentPath: '/auth/login',
      errorMessage: 'Something went wrong. Try again.'
    });
  }
});

// GET /auth/register
router.get('/register', (req, res) => {
  res.render('auth/register', {
    currentPath: '/auth/register',
    errorMessage: null
  });
});

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).render('auth/register', {
        currentPath: '/auth/register',
        errorMessage: 'An account with that email already exists.'
      });
    }

    const user = new User({
      email: email.toLowerCase(),
      password,
      displayName
    });

    await user.save();
    req.session.userId = user._id;

    res.redirect('/');
  } catch (err) {
    console.error('register error:', err);
    res.status(500).render('auth/register', {
      currentPath: '/auth/register',
      errorMessage: 'Something went wrong. Try again.'
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