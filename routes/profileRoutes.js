// routes/profileRoutes.js
const express = require('express');
const path = require('path');
const multer = require('multer');
const User = require('../models/User');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

/**
 * MULTER CONFIG FOR PROFILE PHOTO UPLOADS
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'public', 'uploads', 'avatars'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${req.user._id}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

/**
 * PROFILE SUMMARY PAGE (Strava-style "You" screen)
 * GET /account
 */
router.get('/', requireLogin, (req, res) => {
  res.render('account/profile', {
    currentPath: '/account',
    currentUser: req.user,
    profileSaved: req.query.saved === 'true',
    reminderSaved: req.query.reminder === 'true'
  });
});

/**
 * SETTINGS PAGE (edit form)
 * GET /account/settings
 */
router.get('/settings', requireLogin, (req, res) => {
  res.render('workouts/settings', {
    currentPath: '/workouts/settings',
    currentUser: req.user
  });
});

/**
 * UPDATE PROFILE (INCLUDING PROFILE PHOTO + HEIGHT/WEIGHT)
 * POST /account/profile
 */
router.post(
  '/profile',
  requireLogin,
  upload.single('profilePhoto'),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.redirect('/auth/login');
      }

      // --- BASIC FIELDS ---
      user.displayName = req.body.displayName || user.displayName;

      const weeklyGoalNum = Number(req.body.weeklyGoal);
      if (!Number.isNaN(weeklyGoalNum) && weeklyGoalNum > 0) {
        user.weeklyGoal = weeklyGoalNum;
      }

      if (req.body.gender) {
        user.gender = req.body.gender;
      }

      if (req.body.age) {
        const ageNum = Number(req.body.age);
        if (!Number.isNaN(ageNum)) {
          user.age = ageNum;
        }
      }

      // --- HEIGHT (accepts decimals and 5'10 style) ---
      let heightValue = user.heightValue;
      let heightUnit = req.body.heightUnit || user.heightUnit || 'cm';
      const rawHeight = (req.body.heightRaw || '').trim();

      if (rawHeight) {
        // Replace curly quotes with normal '
        const clean = rawHeight.replace(/[’‘]/g, "'");

        // 5'10 or 6' style
        const feetInchesMatch = clean.match(/(\d+)\s*'\s*(\d+)?/);
        if (feetInchesMatch) {
          const feet = parseInt(feetInchesMatch[1], 10) || 0;
          const inches = parseInt(feetInchesMatch[2] || '0', 10) || 0;
          heightUnit = 'ft';
          heightValue = feet + inches / 12;
        } else {
          const parsed = parseFloat(clean);
          if (!Number.isNaN(parsed)) {
            heightValue = parsed;
          }
        }
      }

      user.heightUnit = heightUnit;
      if (heightValue != null) {
        user.heightValue = heightValue;
      }

      // --- WEIGHT (decimals allowed) ---
      let weightValue = user.weightValue;
      let weightUnit = req.body.weightUnit || user.weightUnit || 'kg';
      const rawWeight = (req.body.weightRaw || '').trim();

      if (rawWeight) {
        const parsed = parseFloat(rawWeight);
        if (!Number.isNaN(parsed)) {
          weightValue = parsed;
        }
      }

      user.weightUnit = weightUnit;
      if (weightValue != null) {
        user.weightValue = weightValue;
      }

      // --- GOAL / EXPERIENCE (match User.js enums) ---
      if (req.body.primaryGoal) {
        user.primaryGoal = req.body.primaryGoal;
      }
      if (req.body.trainingExperience) {
        user.trainingExperience = req.body.trainingExperience;
      }

      // --- PROFILE PHOTO ---
      if (req.file) {
        const relPath = `/uploads/avatars/${req.file.filename}`;
        user.profilePhotoUrl = relPath;
      }

      await user.save();

      // refresh user in session so header avatar + name update immediately
      req.session.user = user;

      // After saving, go to the Strava-style profile page
      res.redirect('/account?saved=true');
    } catch (err) {
      console.error('Error updating profile:', err);
      res.redirect('/account/settings');
    }
  }
);

/**
 * UPDATE THEME
 * POST /account/theme
 */
router.post('/theme', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.redirect('/auth/login');

    user.theme = req.body.theme === 'light' ? 'light' : 'dark';
    await user.save();
    req.session.user = user;

    res.redirect('back');
  } catch (err) {
    console.error('Error updating theme:', err);
    res.redirect('back');
  }
});

/**
 * UPDATE REMINDER SETTINGS
 * POST /account/reminder
 */
router.post('/reminder', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.redirect('/auth/login');

    user.dailyReminderEnabled =
      req.body.reminderEnabled === 'on' || req.body.reminderEnabled === 'true';
    user.reminderTime = req.body.reminderTime || user.reminderTime || '18:00';

    await user.save();
    req.session.user = user;

    res.redirect('/account?reminder=true');
  } catch (err) {
    console.error('Error updating reminders:', err);
    res.redirect('/account/settings');
  }
});

/**
 * DELETE ACCOUNT
 * POST /account/delete
 */
router.post('/delete', requireLogin, async (req, res) => {
  try {
    await User.deleteOne({ _id: req.user._id });
    req.session.destroy(() => {
      res.redirect('/');
    });
  } catch (err) {
    console.error('Error deleting account:', err);
    res.redirect('/account/settings');
  }
});

module.exports = router;