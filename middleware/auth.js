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


const requireLogin = async (req, res, next) => {
  try {
    const userId = req.session && req.session.userId;
    if (!userId) return res.redirect('/auth/login');

    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
    
      req.session.destroy(() => {});
      return res.redirect('/auth/login?toast=session-expired&type=error');
    }

    return next();
  } catch (err) {
    console.error('requireLogin error:', err);
    return res.redirect('/auth/login');
  }
};

module.exports = { attachUser, requireLogin };