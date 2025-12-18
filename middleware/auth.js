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

module.exports = { attachUser, requireLogin };