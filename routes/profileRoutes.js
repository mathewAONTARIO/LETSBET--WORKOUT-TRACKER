const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('../models/User');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

/* =========================
   AVATAR UPLOAD SETUP
========================= */
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
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, true);
  }
});

const normalize = (s) => String(s || '').replace(/[’‘]/g, "'");

/* =========================
   ✅ PROFILE PAGE (REAL ROUTE)
========================= */
router.get('/profile', requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (!user) return res.redirect('/auth/login');

  res.render('workouts/settings', {
    currentPath: '/account/profile',
    currentUser: user,
    profileSaved: req.query.saved === '1',
    reminderSaved: req.query.reminder === '1'
  });
});

/* =========================
   🔁 LEGACY SETTINGS → PROFILE
========================= */
router.get('/settings', requireLogin, (req, res) => {
  const qs = req.originalUrl.includes('?')
    ? req.originalUrl.slice(req.originalUrl.indexOf('?'))
    : '';
  res.redirect(`/account/profile${qs}`);
});

/* =========================
   SAVE PROFILE
========================= */
router.post('/profile', requireLogin, upload.single('profilePhoto'), async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect('/auth/login');

    if (req.body.displayName?.trim()) {
      user.displayName = req.body.displayName.trim();
    }

    if (req.body.weeklyGoal) {
      const wg = parseInt(req.body.weeklyGoal, 10);
      if (!Number.isNaN(wg)) user.weeklyGoal = wg;
    }

    if (req.body.gender) user.gender = req.body.gender;

    if (req.body.age) {
      const ageNum = parseInt(req.body.age, 10);
      if (!Number.isNaN(ageNum)) user.age = ageNum;
    }

    if (req.body.height) user.heightValue = normalize(req.body.height);
    if (req.body.heightUnit) user.heightUnit = req.body.heightUnit;

    if (req.body.weight) user.weightValue = normalize(req.body.weight);
    if (req.body.weightUnit) user.weightUnit = req.body.weightUnit;

    if (req.body.targetWeight) user.targetWeightValue = normalize(req.body.targetWeight);
    if (req.body.targetWeightUnit) user.targetWeightUnit = req.body.targetWeightUnit;

    if (req.body.primaryGoal) user.primaryGoal = req.body.primaryGoal;
    if (req.body.trainingExperience) user.trainingExperience = req.body.trainingExperience;

    if (req.file) {
      user.profilePhotoUrl = `/uploads/avatars/${req.file.filename}`;
    }

    await user.save();

    // keep session in sync
    req.session.user = {
      ...(req.session.user || {}),
      displayName: user.displayName,
      profilePhotoUrl: user.profilePhotoUrl,
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
      trainingExperience: user.trainingExperience
    };

    res.redirect('/account/profile?saved=1');
  } catch (err) {
    console.error(err);
    res.redirect('/account/profile?error=1');
  }
});

/* =========================
   SAVE REMINDER SETTINGS
========================= */
router.post('/reminder', requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (!user) return res.redirect('/auth/login');

  user.dailyReminderEnabled =
    req.body.reminderEnabled === 'true' ||
    req.body.reminderEnabled === 'on';

  user.reminderTime = req.body.reminderTime || '18:00';

  await user.save();

  req.session.user = {
    ...(req.session.user || {}),
    dailyReminderEnabled: user.dailyReminderEnabled,
    reminderTime: user.reminderTime
  };

  res.redirect('/account/profile?reminder=1');
});

/* =========================
   THEME TOGGLE
========================= */
router.post('/theme', requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (!user) return res.redirect('/auth/login');

  user.theme = req.body.theme === 'light' ? 'light' : 'dark';
  await user.save();

  req.session.user = { ...(req.session.user || {}), theme: user.theme };
  res.redirect(req.get('referer') || '/');
});

/* =========================
   DELETE ACCOUNT
========================= */
router.post('/delete', requireLogin, async (req, res) => {
  await User.deleteOne({ _id: req.session.userId });
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;