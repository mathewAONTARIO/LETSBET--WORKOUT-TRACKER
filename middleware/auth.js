const User = require('../models/User');

const attachUser = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      res.locals.currentUser = null;
      return next();
    }

    const user = await User.findById(req.session.userId).lean();
    res.locals.currentUser = user || null;
    next();
  } catch (err) {
    console.error(err);
    res.locals.currentUser = null;
    next();
  }
};

const requireLogin = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
};

module.exports = { attachUser, requireLogin };