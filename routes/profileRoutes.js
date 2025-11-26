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
 * Small helper to parse height strings like:
 *  - "5'10"
 *  - "5 10"
 *  - "180" or "178.5"
 * into a numeric value + unit (cm or ft).
 */
function parseHeightToValue(raw, selectedUnit, currentValue) {
  if (!raw || !raw.trim()) {
    return {
      value: currentValue,
      unit: selectedUnit || 'cm'
    };
  }

  const unit = selectedUnit || 'cm';
  const txt = raw.trim();

  // Formats with feet/inches (e.g. 5'10 or 5 10")
  if (txt.includes("'")) {
    const parts = txt.split("'");
    const feet = parseFloat(parts[0]) || 0;
    const inchesPart = parts[1] ? parts[1].replace(/[^0-9.]/g, '') : '0';
    const inches = parseFloat(inchesPart) || 0;

    if (unit === 'ft') {
      const totalFeet = feet + inches / 12;
      return {
        value: parseFloat(totalFeet.toFixed(2)),
        unit: 'ft'
      };
    } else {
      const totalCm = feet * 30.48 + inches * 2.54;
      return {
        value: parseFloat(totalCm.toFixed(1)),
        unit: 'cm'
      };
    }
  }

  // Plain number: "180", "178.5"
  const cleaned = parseFloat(txt.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(cleaned)) {
    return {
      value: currentValue,
      unit
    };
  }

  return {
    value: cleaned,
    unit
  };
}

/**
 * SETTINGS PAGE (edit form)
 */
router.get('/settings', requireLogin, (req, res) => {
  res.render('workouts/settings', {
    currentPath: '/workouts/settings',
    currentUser: req.user
  });
});

/**
 * UPDATE PROFILE (INCLUDING PROFILE PHOTO + STATS)
 * This is the form from Settings.
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
        const wg = parseInt(req.body.weeklyGoal, 10);
        if (!Number.isNaN(wg) && wg > 0 && wg <= 14) {
          user.weeklyGoal = wg;
        }
      }

      // Gender + age
      if (req.body.gender) {
        user.gender = req.body.gender;
      }

      if (req.body.age) {
        const ageNum = parseInt(req.body.age, 10);
        if (!Number.isNaN(ageNum)) {
          user.age = ageNum;
        }
      }

      // Height (text) + unit dropdown
      const heightUnit = req.body.heightUnit || user.heightUnit || 'cm';
      const parsedHeight = parseHeightToValue(
        req.body.height,
        heightUnit,
        user.heightValue
      );
      user.heightValue = parsedHeight.value;
      user.heightUnit = parsedHeight.unit;

      // Weight (text) + unit dropdown
      if (req.body.weight && req.body.weight.trim()) {
        const weightNum = parseFloat(
          req.body.weight.trim().replace(/[^0-9.]/g, '')
        );
        if (!Number.isNaN(weightNum)) {
          user.weightValue = weightNum;
        }
      }
      user.weightUnit = req.body.weightUnit || user.weightUnit || 'kg';

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

      // refresh user in session so header avatar updates immediately
      req.session.user = user;

      // After saving settings, go to profile summary page
      res.redirect('/account/profile?saved=true');
    } catch (err) {
      console.error('Error updating profile:', err);
      res.redirect('/account/profile?error=true');
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

    res.redirect('back');
  } catch (err) {
    console.error('Error updating theme:', err);
    res.redirect('back');
  }
});

/**
 * UPDATE REMINDER SETTINGS
 */
router.post('/reminder', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.redirect('/auth/login');

    user.dailyReminderEnabled = req.body.reminderEnabled === 'true' ||
      req.body.reminderEnabled === 'on';

    if (req.body.reminderTime) {
      user.reminderTime = req.body.reminderTime;
    }

    await user.save();
    req.session.user = user;

    res.redirect('/account/profile?saved=true');
  } catch (err) {
    console.error('Error updating reminders:', err);
    res.redirect('/account/profile?error=true');
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