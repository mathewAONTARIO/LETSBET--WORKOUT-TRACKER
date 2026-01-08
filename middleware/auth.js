const mongoose = require('mongoose');
const User = require('../models/User');

const attachUser = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      res.locals.currentUser = null;
      return next();
    }

    // If it's not even a valid ObjectId, clear it
    if (!mongoose.Types.ObjectId.isValid(req.session.userId)) {
      req.session.destroy(() => {});
      res.locals.currentUser = null;
      return next();
    }

    const user = await User.findById(req.session.userId).lean();
    res.locals.currentUser = user || null;

    // If user no longer exists (DB got wiped), clear session
    if (!user) {
      req.session.destroy(() => {});
    }

    next();
  } catch (err) {
    console.error(err);
    res.locals.currentUser = null;
    next();
  }
};

const requireLogin = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.redirect('/auth/login');
    }

    // Invalid ID in session → force re-login
    if (!mongoose.Types.ObjectId.isValid(req.session.userId)) {
      req.session.destroy(() => {});
      return res.redirect('/auth/login');
    }

    // Session userId exists but user got deleted → force re-login
    const exists = await User.exists({ _id: req.session.userId });
    if (!exists) {
      req.session.destroy(() => {});
      return res.redirect('/auth/login');
    }

    return next();
  } catch (err) {
    console.error('requireLogin error:', err);
    return res.redirect('/auth/login');
  }
};

/**
 * ✅ Gender gate:
 * - forces users to pick gender before logging workouts
 * - redirects to /account/profile?onboarding=1&next=<current-url>
 */
const requireGender = (req, res, next) => {
  const user = res.locals.currentUser;

  // requireLogin should run before this, but stay safe:
  if (!user) return res.redirect('/auth/login');

  const gender = String(user.gender || '').toLowerCase().trim();

  // Treat missing or default as "not set"
  const notSet = !gender || gender === 'prefer-not-to-say';

  if (!notSet) return next();

  const nextUrl = encodeURIComponent(req.originalUrl || '/workouts');
  return res.redirect(`/account/profile?onboarding=1&next=${nextUrl}`);
};

module.exports = { attachUser, requireLogin, requireGender };