const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const User = require('../models/User');

router.get('/', requireLogin, (req, res) => {
  res.render('workouts/account', { currentPath: '/workouts/settings' });
});

router.post('/goal', requireLogin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.session.userId, {
      weeklyGoal: Number(req.body.weeklyGoal) || 4
    });
    res.redirect('/account');
  } catch (err) {
    console.error('update goal error:', err);
    res.redirect('/account');
  }
});

router.post('/account/theme', (req, res) => {
  req.session.theme = req.body.theme;
  res.redirect('back');
});

module.exports = router;