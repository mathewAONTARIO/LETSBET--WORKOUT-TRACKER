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

module.exports = { attachUser };