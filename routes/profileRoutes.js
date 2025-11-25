// routes/profileRoutes.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('../models/User');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

/**
 * MULTER CONFIG FOR PROFILE PHOTO UPLOADS
 * - Ensures the avatars folder exists (fixes 502 on Render)
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'public', 'uploads', 'avatars');

    // Make sure the folder exists even on a fresh Render deploy
    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
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
 * SETTINGS PAGE
 */
router.get('/settings', requireLogin, (req, res) => {
  res.render('workouts/settings', {
    currentPath: '/workouts/settings',
    currentUser: req.user
  });
});

/**
 * Helper: parse height string
 * Supports:
 *  - 180          (cm)
 *  - 5.11         (feet as decimal)
 *  - 5'11, 5'11"  (feet + inches)
 */
function parseHeight(raw, unit) {
  if (!raw) return null;
  const cleaned = String(raw).trim();
  if (!cleaned) return null;

  if (unit === 'ft') {
    // 5'11 or 5 11
    const match = cleaned.match(/(\d+)\s*'?[\s-]*(\d+)?/);
    if (match) {
      const feet = parseInt(match[1], 10);
      const inches = match[2] ? parseInt(match[2], 10) : 0;
      const totalFeet = feet + inches / 12;
      return Number(totalFeet.toFixed(2));
    }

    // Fallback: 5.9 style
    const asNum = parseFloat(cleaned);
    if (!isNaN(asNum)) return asNum;
    return null;
  }

  // cm
  const cm = parseFloat(cleaned);
  if (isNaN(cm)) return null;
  return cm;
}

/**
 * UPDATE PROFILE (INCLUDING PROFILE PHOTO)
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

      // ----- BASIC FIELDS -----
      if (req.body.displayName && req.body.displayName.trim()) {
        user.displayName = req.body.displayName.trim();
      }

      if (req.body.weeklyGoal) {
        const wg = Number(req.body.weeklyGoal);
        if (!isNaN(wg) && wg > 0 && wg <= 14) {
          user.weeklyGoal = wg;
        }
      }

      // ----- GENDER / AGE -----
      if (req.body.gender) {
        user.gender = req.body.gender;
      } else {
        user.gender = 'prefer-not-to-say';
      }

      if (req.body.age) {
        const age = Number(req.body.age);
        if (!isNaN(age) && age >= 0 && age <= 130) {
          user.age = age;
        }
      }

      // ----- HEIGHT (supports 5'11, 5.11, 180) -----
      const heightUnit = req.body.heightUnit === 'ft' ? 'ft' : 'cm';
      user.heightUnit = heightUnit;

      const heightValueParsed = parseHeight(req.body.heightRaw, heightUnit);
      if (heightValueParsed !== null) {
        user.heightValue = heightValueParsed;
      }

      // ----- WEIGHT (allow decimals) -----
      const weightUnit = req.body.weightUnit === 'lb' ? 'lb' : 'kg';
      user.weightUnit = weightUnit;

      if (req.body.weightValue) {
        const wv = parseFloat(req.body.weightValue);
        if (!isNaN(wv) && wv >= 0) {
          user.weightValue = wv;
        }
      }

      // ----- GOAL / EXPERIENCE -----
      if (req.body.primaryGoal) {
        user.primaryGoal = req.body.primaryGoal;
      }

      if (req.body.trainingExperience) {
        user.trainingExperience = req.body.trainingExperience;
      }

      // ----- PROFILE PHOTO -----
      if (req.file) {
        const relPath = `/uploads/avatars/${req.file.filename}`;
        user.profilePhotoUrl = relPath;
      }

      await user.save();

      // Refresh user in session so header + settings see latest data
      req.session.user = user;
      req.user = user;

      res.redirect('/workouts/settings');
    } catch (err) {
      console.error('Error updating profile:', err);
      res.redirect('/workouts/settings');
    }
  }
);

/**
 * UPDATE THEME
 */
router.post('/theme', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.redirect('/auth/login');

    user.theme = req.body.theme === 'light' ? 'light' : 'dark';
    await user.save();

    // Sync with session so setTheme picks it up
    req.session.user = user;
    req.session.theme = user.theme;
    req.user = user;

    res.redirect('/workouts/settings');
  } catch (err) {
    console.error('Error updating theme:', err);
    res.redirect('/workouts/settings');
  }
});

/**
 * UPDATE REMINDER SETTINGS
 */
router.post('/reminder', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.redirect('/auth/login');

    user.dailyReminderEnabled = req.body.dailyReminderEnabled === 'on';
    user.reminderTime = req.body.reminderTime || user.reminderTime || '18:00';

    await user.save();
    req.session.user = user;
    req.user = user;

    res.redirect('/workouts/settings');
  } catch (err) {
    console.error('Error updating reminders:', err);
    res.redirect('/workouts/settings');
  }
});

/**
 * DELETE ACCOUNT
 */
router.post('/delete', requireLogin, async (req, res) => {
  try {
    await User.deleteOne({ _id: req.user._id });
    req.session.destroy(() => {
      res.redirect('/');
    });
  } catch (err) {
    console.error('Error deleting account:', err);
    res.redirect('/workouts/settings');
  }
});

module.exports = router;