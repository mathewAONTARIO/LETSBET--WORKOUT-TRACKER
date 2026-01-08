const User = require('../models/User');

module.exports = async function requireProfileComplete(req, res, next) {
  try {
    // not logged in? let other routes handle it
    if (!req.session || !req.session.userId) return next();

    // allow profile/settings related routes so you don't get redirect loops
    const allow = [
      '/account/profile',
      '/account/settings',
      '/account/reminder',
      '/account/theme',
      '/account/delete',
      '/auth/logout'
    ];

    if (allow.some((p) => req.path.startsWith(p))) return next();

    // attachUser already put this in locals; fallback just in case
    const user =
      res.locals.currentUser || (await User.findById(req.session.userId).lean());

    if (!user) return next();

    const gender = user.gender;
    const missingGender =
      !gender ||
      gender === '' ||
      gender === 'prefer-not-to-say' ||
      gender === 'prefer_not_say';

    if (missingGender) {
      return res.redirect('/account/settings?need=gender');
    }

    return next();
  } catch (err) {
    console.error('requireProfileComplete error:', err);
    return next();
  }
};