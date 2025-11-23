const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/login', (req, res) => {
  res.render('auth/login', {
    errorMessage: null,
    email: ''
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.render('auth/login', {
        errorMessage: 'Invalid email or password.',
        email
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('auth/login', {
        errorMessage: 'Invalid email or password.',
        email
      });
    }

    req.session.userId = user._id;
    req.session.theme = req.session.theme || 'dark';

    res.redirect('/');
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.render('auth/login', {
      errorMessage: 'Something went wrong. Try again.',
      email
    });
  }
});

router.get('/register', (req, res) => {
  res.render('auth/register', {
    errorMessage: null
  });
});

router.post('/register', async (req, res) => {
  const { email, password, displayName } = req.body;

  try {
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.render('auth/register', {
        errorMessage: 'An account with that email already exists.'
      });
    }

    const user = new User({
      email: email.trim().toLowerCase(),
      password,
      displayName: displayName || ''
    });

    await user.save();

    req.session.userId = user._id;
    req.session.theme = 'dark';

    res.redirect('/');
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.render('auth/register', {
      errorMessage: 'Something went wrong. Try again.'
    });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
});

module.exports = router;