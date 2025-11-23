module.exports = function (req, res, next) {
  res.locals.currentTheme = req.session.theme || 'dark';
  next();
};