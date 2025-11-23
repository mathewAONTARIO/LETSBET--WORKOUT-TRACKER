const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

router.get('/register', (req, res) => {
  res.render('auth/register', { currentPath: '/auth/register', error: null });
});

router.post('/register', async (req, res) => {
  try {
    const { email, displayName, password } = req.body;

    if (!email || !displayName || !password) {
      return res.render('auth/register', {
        currentPath: '/auth/register',
        error: 'All fields are required.'
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.render('auth/register', {
        currentPath: '/auth/register',
        error: 'Email is already registered.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, displayName, passwordHash });

    req.session.userId = user._id;
    res.redirect('/');
  } catch (err) {
    res.render('auth/register', {
      currentPath: '/auth/register',
      error: 'Something went wrong. Try again.'
    });
  }
});

router.get('/login', (req, res) => {
  res.render('auth/login', { currentPath: '/auth/login', error: null });
});

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

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.render('auth/login', {
        currentPath: '/auth/login',
        error: 'Invalid email or password.'
      });
    }

    req.session.userId = user._id;
    res.redirect('/');
  } catch (err) {
    res.render('auth/login', {
      currentPath: '/auth/login',
      error: 'Something went wrong. Try again.'
    });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;