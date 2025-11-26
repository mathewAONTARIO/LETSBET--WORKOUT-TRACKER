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
 * (We render the old workouts/settings.ejs so your navbar link still works.)
 */
router.get('/settings', requireLogin, (req, res) => {
  const profileSaved = req.query.saved === '1';
  const reminderSaved = req.query.reminder === '1';

  res.render('workouts/settings', {
    currentPath: '/workouts/settings',
    currentUser: req.user,
    profileSaved,
    reminderSaved
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

      // Refresh user in session so navbar pill updates
      req.session.user = user;

      // Redirect with success flag
      res.redirect('/workouts/settings?saved=1');
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

    user.dailyReminderEnabled = req.body.reminderEnabled === 'on';
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