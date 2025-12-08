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
    const userId = req.session.userId || 'anon';
    cb(null, `${userId}-${Date.now()}${ext}`);
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
router.get('/settings', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/auth/login');

    const user = await User.findById(userId);
    if (!user) return res.redirect('/auth/login');

    const profileSaved = req.query.saved === '1';
    const reminderSaved = req.query.reminder === '1';

    res.render('workouts/settings', {
      currentPath: '/workouts/settings',
      currentUser: user,
      profileSaved,
      reminderSaved
    });
  } catch (err) {
    console.error('Error rendering settings page:', err);
    res.redirect('/');
  }
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
      const userId = req.session.userId;
      if (!userId) return res.redirect('/auth/login');

      const user = await User.findById(userId);
      if (!user) return res.redirect('/auth/login');

      // Basic fields
      if (req.body.displayName) {
        user.displayName = req.body.displayName;
      }

      if (req.body.weeklyGoal) {
        const wg = parseInt(req.body.weeklyGoal, 10);
        if (!Number.isNaN(wg)) {
          user.weeklyGoal = wg;
        }
      }

      user.gender = req.body.gender || user.gender || 'prefer-not-to-say';

      if (req.body.age) {
        const ageNum = parseInt(req.body.age, 10);
        if (!Number.isNaN(ageNum)) {
          user.age = ageNum;
        }
      }

      // Height (text, can be 5'10 or 180)
      if (req.body.height) {
        user.heightValue = req.body.height.trim();
      }
      if (req.body.heightUnit) {
        user.heightUnit = req.body.heightUnit;
      }

      // Weight (text, can be decimal)
      if (req.body.weight) {
        user.weightValue = req.body.weight.trim();
      }
      if (req.body.weightUnit) {
        user.weightUnit = req.body.weightUnit;
      }

      // Weight goal
      if (req.body.targetWeight) {
        user.targetWeightValue = req.body.targetWeight.trim();
      }
      if (req.body.targetWeightUnit) {
        user.targetWeightUnit = req.body.targetWeightUnit;
      }

      // Goal / experience
      if (req.body.primaryGoal) {
        user.primaryGoal = req.body.primaryGoal;
      }
      if (req.body.trainingExperience) {
        user.trainingExperience = req.body.trainingExperience;
      }

      // Profile picture
      if (req.file) {
        const relPath = `/uploads/avatars/${req.file.filename}`;
        user.profilePhotoUrl = relPath;
      }

      await user.save();

      // Keep session alive + update cached user info
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

      res.redirect('/account/settings?saved=1&toast=profile-saved&type=success');
    } catch (err) {
      console.error('Error updating profile:', err);
      res.redirect('/account/settings?toast=error&type=error');
    }
  }
);

/**
 * UPDATE THEME
 */
router.post('/theme', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/auth/login');

    const user = await User.findById(userId);
    if (!user) return res.redirect('/auth/login');

    user.theme = req.body.theme === 'light' ? 'light' : 'dark';
    await user.save();

    // update session copy
    req.session.userId = user._id;
    req.session.user = {
      ...(req.session.user || {}),
      _id: user._id,
      theme: user.theme
    };

    res.redirect('/account/settings');
  } catch (err) {
    console.error('Error updating theme:', err);
    res.redirect('/account/settings?toast=error&type=error');
  }
});

/**
 * UPDATE REMINDER SETTINGS
 */
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

    req.session.userId = user._id;
    req.session.user = {
      ...(req.session.user || {}),
      _id: user._id,
      dailyReminderEnabled: user.dailyReminderEnabled,
      reminderTime: user.reminderTime
    };

    res.redirect(
      '/account/settings?reminder=1&toast=reminder-saved&type=success'
    );
  } catch (err) {
    console.error('Error updating reminders:', err);
    res.redirect('/account/settings?toast=error&type=error');
  }
});

/**
 * DELETE ACCOUNT
 */
router.post('/delete', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/auth/login');

    await User.deleteOne({ _id: userId });
    req.session.destroy(() => {
      res.redirect('/');
    });
  } catch (err) {
    console.error('Error deleting account:', err);
    res.redirect('/account/settings?toast=error&type=error');
  }
});

module.exports = router;