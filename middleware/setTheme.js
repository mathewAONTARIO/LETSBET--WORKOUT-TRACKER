// middleware/setTheme.js

module.exports = (req, res, next) => {
  // Default
  let theme = 'dark';

  // 1) If logged-in user has a theme in the DB, prefer that
  if (req.user && req.user.theme) {
    theme = req.user.theme;
  }
  // 2) Otherwise fall back to whatever is in the session
  else if (req.session && req.session.theme) {
    theme = req.session.theme;
  }

  // Persist to session so it sticks between requests
  if (req.session) {
    req.session.theme = theme;
  }

  // Expose to all views (header.ejs uses currentTheme)
  res.locals.currentTheme = theme;

  next();
};