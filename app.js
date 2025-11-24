require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const connectDB = require('./config/db');

const indexRoutes = require('./routes/index');
const workoutRoutes = require('./routes/workoutRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes'); // ✅ Add this

const { attachUser } = require('./middleware/auth');
const setTheme = require('./middleware/setTheme');

const app = express();

// Connect to MongoDB
connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'devsecret',
    resave: false,
    saveUninitialized: false
  })
);

// Apply theme + user data to views
app.use(setTheme);
app.use(attachUser);

// Route handlers
app.use('/', indexRoutes);
app.use('/workouts', workoutRoutes);
app.use('/auth', authRoutes);

// ✅ FIX: Add account/profile/settings routes
app.use('/account', profileRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});