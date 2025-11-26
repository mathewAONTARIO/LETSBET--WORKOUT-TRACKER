// routes/profileRoutes.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('../models/User');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

/**
 * Ensure upload directory exists
 */
const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * MULTER CONFIG FOR PROFILE PHOTO UPLOADS
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
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
 * HELPER PARSERS
 */

// Parse height allowing: "180", "180.5" (cm) OR "5'11", "5 11", "5.11" (ft)
function parseHeight(raw, unit) {
  if (!raw) return null;
  let value = String(raw).trim();
  if (!value) return null;

  if (unit === 'ft') {
    // Look for 5'11 or 5’11
    const match = value.match(/^(\d+)\s*['’]\s*(\d+)?/);
    if (match) {
      const feet = parseInt(match[1], 10) || 0;
      const inches = match[2] ? parseInt(match[2], 10) || 0 : 0;
      return feet + inches / 12;
    }

    // Fall back to float feet (e.g., 5.9)
    value = value.replace(/[^0-9.]/g, '');
    const ftFloat = parseFloat(value);
    return Number.isNaN(ftFloat) ? null : ftFloat;
  }

  // cm
  value = value.replace(/[^0-9.]/g, '');
  const cm = parseFloat(value);
  return Number.isNaN(cm) ? null : cm;
}

// Parse numeric weight with "."
function parseWeight(raw) {
  if (!raw) return null;
  let value = String(raw).trim();
  if (!value) return null;

  value = value.replace(/[^0-9.]/g, '');
  const num = parseFloat(value);
  return Number.isNaN(num) ? null : num;
}

/**
 * SETTINGS PAGE
 */
router.get('/settings', requireLogin, (req, res) => {
  res.render('workouts/settings', {
    currentPath: '/workouts/settings',
    currentUser: req.user,
    profileSaved: req.query.profile === '1',
    reminderSaved: req.query.reminder === '1'
  });
});

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

      // Basic fields
      if (req.body.displayName && req.body.displayName.trim()) {
        user.displayName = req.body.displayName.trim();
      }

      if (req.body.weeklyGoal) {
        const wg = Number(req.body.weeklyGoal);
        if (!Number.isNaN(wg) && wg > 0 && wg <= 14) {
          user.weeklyGoal = wg;
        }
      }

      // Gender
      if (req.body.gender) {
        user.gender = req.body.gender;
      } else {
        user.gender = 'prefer-not-to-say';
      }

      // Age
      if (req.body.age) {
        const age = Number(req.body.age);
        if (!Number.isNaN(age) && age >= 0 && age <= 130) {
          user.age = age;
        }
      }

      // Height
      const heightUnit = req.body.heightUnit || user.heightUnit || 'cm';
      user.heightUnit = heightUnit;

      const heightParsed = parseHeight(req.body.heightValue, heightUnit);
      if (heightParsed !== null) {
        user.heightValue = heightParsed;
      }

      // Weight
      const weightUnit = req.body.weightUnit || user.weightUnit || 'kg';
      user.weightUnit = weightUnit;

      const weightParsed = parseWeight(req.body.weightValue);
      if (weightParsed !== null) {
        user.weightValue = weightParsed;
      }

      // Goal / experience
      if (req.body.primaryGoal) {
        user.primaryGoal = req.body.primaryGoal;
      }

      if (req.body.trainingExperience) {
        user.trainingExperience = req.body.trainingExperience;
      }

      // If a file was uploaded, update profilePhotoUrl
      if (req.file) {
        const relPath = `/uploads/avatars/${req.file.filename}`;
        user.profilePhotoUrl = relPath;
      }

      await user.save();

      // refresh user in session so header avatar & settings show latest
      req.session.user = user;

      res.redirect('/workouts/settings?profile=1');
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
    req.session.user = user;

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

    user.dailyReminderEnabled = req.body.reminderEnabled === 'true' || req.body.reminderEnabled === 'on';
    user.reminderTime = req.body.reminderTime || user.reminderTime || '18:00';

    await user.save();
    req.session.user = user;

    res.redirect('/workouts/settings?reminder=1');
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