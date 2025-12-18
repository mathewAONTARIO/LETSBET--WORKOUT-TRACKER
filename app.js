require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose'); // ✅ for DB health check
const connectDB = require('./config/db');

const indexRoutes = require('./routes/index');
const workoutRoutes = require('./routes/workoutRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const mealRoutes = require('./routes/mealRoutes');

const { attachUser } = require('./middleware/auth');
const setTheme = require('./middleware/setTheme');

const app = express();

/* -------------------- TRUST PROXY (EB / ALB) -------------------- */
// Must be BEFORE sessions so secure cookies work behind AWS load balancer
app.set('trust proxy', 1);

/* -------------------- BODY + STATIC -------------------- */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

/* -------------------- VIEW ENGINE -------------------- */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* -------------------- DB -------------------- */
connectDB();

/* -------------------- HEALTH CHECK -------------------- */
// Used by Elastic Beanstalk / ALB
app.get('/health', async (req, res) => {
  try {
    // 1 = connected, 2 = connecting
    const dbState = mongoose.connection.readyState;
    const dbOk = dbState === 1;

    if (!dbOk) {
      return res.status(500).json({
        status: 'degraded',
        db: 'disconnected',
        dbState
      });
    }

    return res.status(200).json({
      status: 'ok',
      db: 'connected'
    });
  } catch (e) {
    return res.status(500).json({ status: 'error' });
  }
});

/* -------------------- SESSIONS -------------------- */
const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URI;
const sessionSecret = process.env.SESSION_SECRET;

if (process.env.NODE_ENV === 'production' && !sessionSecret) {
  console.error('SESSION_SECRET is missing in production environment variables');
  process.exit(1);
}

app.use(
  session({
    name: 'sid',
    secret: sessionSecret || 'devsecret',
    resave: false,
    saveUninitialized: false,

    // Only use Mongo session store if a Mongo URL exists
    ...(mongoUrl
      ? {
          store: MongoStore.create({
            mongoUrl,
            ttl: 60 * 60 * 24 * 7 // 7 days
          })
        }
      : {}),

    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      // 'auto' respects req.secure (works with trust proxy)
      secure: process.env.NODE_ENV === 'production' ? 'auto' : false,
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
  })
);

/* -------------------- GLOBAL MIDDLEWARE -------------------- */
app.use(attachUser);
app.use(setTheme);

/* -------------------- ROUTES -------------------- */
app.use('/', indexRoutes);
app.use('/workouts', workoutRoutes);
app.use('/meals', mealRoutes);
app.use('/auth', authRoutes);
app.use('/account', profileRoutes);

/* -------------------- 404 -------------------- */
app.use((req, res) => {
  res.status(404).send('Not found');
});

/* -------------------- SERVER (EB REQUIRED) -------------------- */
const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`NODE_ENV=${process.env.NODE_ENV || 'undefined'}`);
  console.log(`Mongo session store: ${mongoUrl ? 'ON' : 'OFF'}`);
});