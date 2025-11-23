const User = require('../models/User');

module.exports = async function setCurrentUser(req, res, next) {
  try {
    if (!req.session.userId) {
      res.locals.currentUser = null;
      res.locals.currentTheme = 'dark';
      return next();
    }

    const user = await User.findById(req.session.userId).lean();
    if (!user) {
      req.session.userId = null;
      res.locals.currentUser = null;
      res.locals.currentTheme = 'dark';
      return next();
    }

    res.locals.currentUser = user;
    res.locals.currentTheme = user.theme || 'dark';
    next();
  } catch (err) {
    console.error('setCurrentUser error:', err);
    res.locals.currentUser = null;
    res.locals.currentTheme = 'dark';
    next();
  }
};