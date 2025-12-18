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
    try {
      fs.mkdirSync(AVATAR_DIR, { recursive: true }); // ✅ prevents ENOENT in prod
      cb(null, AVATAR_DIR);
    } catch (e) {
      cb(e);
    }
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

router.post('/profile', requireLogin, upload.single('profilePhoto'), async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/auth/login');

    const user = await User.findById(userId);
    if (!user) return res.redirect('/auth/login');

    // ✅ allow empty displayName without blowing up upload-only attempts
    if (typeof req.body.displayName === 'string') {
      const dn = req.body.displayName.trim();
      if (dn.length) user.displayName = dn;
    }

    if (req.body.weeklyGoal) {
      const wg = parseInt(req.body.weeklyGoal, 10);
      if (!Number.isNaN(wg)) user.weeklyGoal = wg;
    }

    if (typeof req.body.gender === 'string' && req.body.gender.length) {
      user.gender = req.body.gender;
    } else {
      user.gender = user.gender || 'prefer-not-to-say';
    }

    if (req.body.age) {
      const ageNum = parseInt(req.body.age, 10);
      if (!Number.isNaN(ageNum)) user.age = ageNum;
    }

    // ✅ store as strings (schema must match — see section #2)
    if (typeof req.body.height === 'string') user.heightValue = req.body.height.trim();
    if (typeof req.body.heightUnit === 'string') user.heightUnit = req.body.heightUnit;

    if (typeof req.body.weight === 'string') user.weightValue = req.body.weight.trim();
    if (typeof req.body.weightUnit === 'string') user.weightUnit = req.body.weightUnit;

    if (typeof req.body.targetWeight === 'string') user.targetWeightValue = req.body.targetWeight.trim();
    if (typeof req.body.targetWeightUnit === 'string') user.targetWeightUnit = req.body.targetWeightUnit;

    if (typeof req.body.primaryGoal === 'string') user.primaryGoal = req.body.primaryGoal;
    if (typeof req.body.trainingExperience === 'string') user.trainingExperience = req.body.trainingExperience;

    if (req.file) {
      user.profilePhotoUrl = `/uploads/avatars/${req.file.filename}`;
    }

    await user.save();

    // refresh session cache
    req.session.userId = user._id;
    req.session.user = {
      ...(req.session.user || {}),
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      profilePhotoUrl: user.profilePhotoUrl,
      theme: user.theme,
      weeklyGoal: user.weeklyGoal,
      dailyReminderEnabled: user.dailyReminderEnabled,
      reminderTime: user.reminderTime
    };

    return res.redirect('/account/settings?saved=1&toast=profile-saved&type=success');
  } catch (err) {
    console.error('Error updating profile:', err);
    return res.redirect('/account/settings?toast=error&type=error');
  }
});

module.exports = router;