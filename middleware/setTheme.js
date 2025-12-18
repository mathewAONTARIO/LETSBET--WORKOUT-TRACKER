module.exports = (req, res, next) => {
  let theme = 'dark';

  const currentUser = res.locals.currentUser || (req.session && req.session.user);

  if (currentUser && currentUser.theme) {
    theme = currentUser.theme;
  } else if (req.session && req.session.theme) {
    theme = req.session.theme;
  }

  if (req.session) {
    req.session.theme = theme;
  }

  res.locals.currentTheme = theme;

  if (!res.locals.currentPath) {
    res.locals.currentPath = req.originalUrl || req.path || '/';
  }

  next();
};