const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('../models/User');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

const AVATAR_DIR = path.join(__dirname, '..', 'public', 'uploads', 'avatars');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
    cb(null, AVATAR_DIR);
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
    if (!file.mimetype.startsWith('image/')) return cb(new Error());
    cb(null, true);
  }
});

const normalize = (s) => s.replace(/[’‘]/g, "'");

router.get('/settings', requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (!user) return res.redirect('/auth/login');

  res.render('workouts/settings', {
    currentPath: '/account/settings',
    currentUser: user,
    profileSaved: req.query.saved === '1',
    reminderSaved: req.query.reminder === '1'
  });
});

router.post('/profile', requireLogin, upload.single('profilePhoto'), async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect('/auth/login');

    if (typeof req.body.displayName === 'string' && req.body.displayName.trim()) {
      user.displayName = req.body.displayName.trim();
    }

    if (req.body.weeklyGoal) {
      const wg = parseInt(req.body.weeklyGoal, 10);
      if (!Number.isNaN(wg)) user.weeklyGoal = wg;
    }

    if (typeof req.body.gender === 'string' && req.body.gender) {
      user.gender = req.body.gender;
    }

    if (req.body.age) {
      const ageNum = parseInt(req.body.age, 10);
      if (!Number.isNaN(ageNum)) user.age = ageNum;
    }

    if (typeof req.body.height === 'string') {
      user.heightValue = normalize(req.body.height.trim());
    }
    if (typeof req.body.heightUnit === 'string') {
      user.heightUnit = req.body.heightUnit;
    }

    if (typeof req.body.weight === 'string') {
      user.weightValue = req.body.weight.trim();
    }
    if (typeof req.body.weightUnit === 'string') {
      user.weightUnit = req.body.weightUnit;
    }

    if (typeof req.body.targetWeight === 'string') {
      user.targetWeightValue = req.body.targetWeight.trim();
    }
    if (typeof req.body.targetWeightUnit === 'string') {
      user.targetWeightUnit = req.body.targetWeightUnit;
    }

    if (typeof req.body.primaryGoal === 'string') {
      user.primaryGoal = req.body.primaryGoal;
    }

    if (typeof req.body.trainingExperience === 'string') {
      user.trainingExperience = req.body.trainingExperience;
    }

    if (req.file) {
      user.profilePhotoUrl = `/uploads/avatars/${req.file.filename}`;
    }

    await user.save();

    req.session.user = {
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      profilePhotoUrl: user.profilePhotoUrl,
      theme: user.theme,
      weeklyGoal: user.weeklyGoal,
      gender: user.gender,
      age: user.age,
      heightValue: user.heightValue,
      heightUnit: user.heightUnit,
      weightValue: user.weightValue,
      weightUnit: user.weightUnit,
      targetWeightValue: user.targetWeightValue,
      targetWeightUnit: user.targetWeightUnit,
      primaryGoal: user.primaryGoal,
      trainingExperience: user.trainingExperience,
      dailyReminderEnabled: user.dailyReminderEnabled,
      reminderTime: user.reminderTime
    };

    res.redirect('/account/settings?saved=1');
  } catch (err) {
    res.redirect('/account/settings?toast=error&type=error');
  }
});

router.post('/reminder', requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (!user) return res.redirect('/auth/login');

  user.dailyReminderEnabled = req.body.reminderEnabled === 'true' || req.body.reminderEnabled === 'on';
  user.reminderTime = req.body.reminderTime || '18:00';

  await user.save();

  req.session.user = {
    ...(req.session.user || {}),
    dailyReminderEnabled: user.dailyReminderEnabled,
    reminderTime: user.reminderTime
  };

  res.redirect('/account/settings?reminder=1');
});

router.post('/theme', requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (!user) return res.redirect('/auth/login');

  user.theme = req.body.theme === 'light' ? 'light' : 'dark';
  await user.save();

  req.session.user = { ...(req.session.user || {}), theme: user.theme };
  res.redirect(req.get('referer') || '/');
});

router.post('/delete', requireLogin, async (req, res) => {
  await User.deleteOne({ _id: req.session.userId });
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;