require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const indexRoutes = require('./routes/index');
const workoutRoutes = require('./routes/workoutRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const mealRoutes = require('./routes/mealRoutes');
const insightsRoutes = require('./routes/insightsRoutes');

const { attachUser } = require('./middleware/auth');
const setTheme = require('./middleware/setTheme');
const requireProfileComplete = require('./middleware/requireProfileComplete'); // ✅ NEW

const app = express();

app.set('trust proxy', 1);

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
  }
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

connectDB();

app.get('/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
      return res.status(500).json({ status: 'degraded' });
    }
    return res.status(200).json({ status: 'ok' });
  } catch {
    return res.status(500).json({ status: 'error' });
  }
});

app.get('/offline', (req, res) => {
  res.status(200).render('offline', { currentPath: '' });
});

const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URI;
const sessionSecret = process.env.SESSION_SECRET;

if (process.env.NODE_ENV === 'production' && !sessionSecret) {
  process.exit(1);
}

app.use(
  session({
    name: 'sid',
    secret: sessionSecret || 'devsecret',
    resave: false,
    saveUninitialized: false,
    ...(mongoUrl
      ? {
          store: MongoStore.create({
            mongoUrl,
            ttl: 60 * 60 * 24 * 7
          })
        }
      : {}),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

// ✅ your user/session locals
app.use(attachUser);

// ✅ theme
app.use(setTheme);

// ✅ NEW: force profile completion (gender) before using app
app.use(requireProfileComplete);

app.use('/', indexRoutes);
app.use('/', insightsRoutes);
app.use('/workouts', workoutRoutes);
app.use('/meals', mealRoutes);
app.use('/auth', authRoutes);
app.use('/account', profileRoutes);

app.use((req, res) => {
  res.status(404).send('Not found');
});

const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, '0.0.0.0');