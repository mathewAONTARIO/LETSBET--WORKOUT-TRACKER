module.exports = (req, res, next) => {
  if (!req.session.theme) {
    req.session.theme = 'dark';
  }

  res.locals.currentTheme = req.session.theme;
  next();
};