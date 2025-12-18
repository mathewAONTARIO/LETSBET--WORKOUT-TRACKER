const express = require('express');
const path = require('path');
const multer = require('multer');
const User = require('../models/User');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '..', 'public', 'uploads', 'avatars'));
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname) || '.png';
    const userId = req.session.userId || 'anon';
    cb(null, `${userId}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

router.get('/settings', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/auth/login');

    const user = await User.findById(userId);
    if (!user) return res.redirect('/auth/login');

    const profileSaved = req.query.saved === '1';
    const reminderSaved = req.query.reminder === '1';

    res.render('workouts/settings', {
      currentPath: '/account/settings',
      currentUser: user,
      profileSaved,
      reminderSaved
    });
  } catch (err) {
    res.redirect('/');
  }
});

router.post(
  '/profile',
  requireLogin,
  upload.single('profilePhoto'),
  async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.redirect('/auth/login');

      const user = await User.findById(userId);
      if (!user) return res.redirect('/auth/login');

      if (req.body.displayName) user.displayName = req.body.displayName;

      if (req.body.weeklyGoal) {
        const wg = parseInt(req.body.weeklyGoal, 10);
        if (!Number.isNaN(wg)) user.weeklyGoal = wg;
      }

      user.gender = req.body.gender || user.gender || 'prefer-not-to-say';

      if (req.body.age) {
        const ageNum = parseInt(req.body.age, 10);
        if (!Number.isNaN(ageNum)) user.age = ageNum;
      }

      if (req.body.height) user.heightValue = req.body.height.trim();
      if (req.body.heightUnit) user.heightUnit = req.body.heightUnit;

      if (req.body.weight) user.weightValue = req.body.weight.trim();
      if (req.body.weightUnit) user.weightUnit = req.body.weightUnit;

      if (req.body.targetWeight)
        user.targetWeightValue = req.body.targetWeight.trim();
      if (req.body.targetWeightUnit)
        user.targetWeightUnit = req.body.targetWeightUnit;

      if (req.body.primaryGoal) user.primaryGoal = req.body.primaryGoal;
      if (req.body.trainingExperience)
        user.trainingExperience = req.body.trainingExperience;

      if (req.file) {
        user.profilePhotoUrl = `/uploads/avatars/${req.file.filename}`;
      }

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

      res.redirect('/account/settings?saved=1');
    } catch (err) {
      res.redirect('/account/settings');
    }
  }
);

router.post('/theme', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/auth/login');

    const user = await User.findById(userId);
    if (!user) return res.redirect('/auth/login');

    user.theme = req.body.theme === 'light' ? 'light' : 'dark';
    await user.save();

    req.session.user = {
      ...(req.session.user || {}),
      _id: user._id,
      theme: user.theme
    };

    const next = req.body.next;
    const redirectTo =
      typeof next === 'string' && next.startsWith('/') ? next : '/';

    res.redirect(redirectTo);
  } catch (err) {
    res.redirect('/');
  }
});

router.post('/reminder', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/auth/login');

    const user = await User.findById(userId);
    if (!user) return res.redirect('/auth/login');

    user.dailyReminderEnabled =
      req.body.reminderEnabled === 'true' || req.body.reminderEnabled === 'on';
    user.reminderTime = req.body.reminderTime || user.reminderTime || '18:00';

    await user.save();

    req.session.user = {
      ...(req.session.user || {}),
      _id: user._id,
      dailyReminderEnabled: user.dailyReminderEnabled,
      reminderTime: user.reminderTime
    };

    res.redirect('/account/settings?reminder=1');
  } catch (err) {
    res.redirect('/account/settings');
  }
});

router.post('/delete', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/auth/login');

    await User.deleteOne({ _id: userId });
    req.session.destroy(() => res.redirect('/'));
  } catch (err) {
    res.redirect('/account/settings');
  }
});

module.exports = router;