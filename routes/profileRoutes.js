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
 * SETTINGS PAGE
 */
router.get('/settings', requireLogin, (req, res) => {
  res.render('workouts/settings', {
    currentPath: '/workouts/settings',
    currentUser: req.user
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
      user.displayName = req.body.displayName || user.displayName;
      user.weeklyWorkoutGoal = Number(req.body.weeklyWorkoutGoal) || user.weeklyWorkoutGoal;

      user.gender = req.body.gender || user.gender || 'Prefer not to say';
      user.age = req.body.age ? Number(req.body.age) : user.age;

      // Height
      user.heightUnit = req.body.heightUnit || user.heightUnit || 'cm';
      if (req.body.height) {
        user.height = Number(req.body.height);
      }

      // Weight + unit
      user.weightUnit = req.body.weightUnit || user.weightUnit || 'kg';
      if (req.body.weight) {
        user.weight = Number(req.body.weight);
      }

      // Goal / experience
      user.primaryGoal = req.body.primaryGoal || user.primaryGoal;
      user.trainingExperience = req.body.trainingExperience || user.trainingExperience;

      // If a file was uploaded, update profilePhotoUrl
      if (req.file) {
        const relPath = `/uploads/avatars/${req.file.filename}`;
        user.profilePhotoUrl = relPath;
      }

      await user.save();

      // refresh user in session so header avatar updates immediately
      req.session.user = user;

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

    user.themePreference = req.body.theme === 'light' ? 'light' : 'dark';
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

    user.reminderEnabled = req.body.reminderEnabled === 'on';
    user.reminderTime = req.body.reminderTime || user.reminderTime || '18:00';

    await user.save();
    req.session.user = user;

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