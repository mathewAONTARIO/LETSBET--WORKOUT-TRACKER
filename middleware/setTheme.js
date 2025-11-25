// middleware/setTheme.js

module.exports = (req, res, next) => {
  // Default theme
  let theme = 'dark';

  // If the logged-in user has a theme, prefer that
  if (req.session && req.session.user && req.session.user.theme) {
    theme = req.session.user.theme;
  } else if (req.session && req.session.theme) {
    // Fallback: old session theme if it exists
    theme = req.session.theme;
  }

  // Persist on session and expose to views
  if (req.session) {
    req.session.theme = theme;
  }
  res.locals.currentTheme = theme;

  next();
};