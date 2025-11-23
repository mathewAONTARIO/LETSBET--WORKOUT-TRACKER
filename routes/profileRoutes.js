const express = require('express');
const router = express.Router();
const User = require('../models/User');

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
}

router.get('/account', requireAuth, async (req, res) => {
  const user = res.locals.currentUser;
  res.render('account', {
    currentPath: '/workouts/settings', 
    user
  });
});

router.post('/account', requireAuth, async (req, res) => {
  try {
    const { displayName, weeklyGoal } = req.body;

    await User.findByIdAndUpdate(
      req.session.userId,
      {
        displayName: displayName?.trim(),
        weeklyGoal: Number(weeklyGoal) || 4
      },
      { runValidators: true }
    );

    res.redirect('/account');
  } catch (err) {
    console.error(err);
    res.redirect('/account');
  }
});

router.post('/account/theme', requireAuth, async (req, res) => {
  try {
    const newTheme = req.body.theme === 'light' ? 'light' : 'dark';
    await User.findByIdAndUpdate(req.session.userId, { theme: newTheme });
    res.redirect('back');
  } catch (err) {
    console.error(err);
    res.redirect('back');
  }
});

module.exports = router;