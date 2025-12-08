require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const connectDB = require('./config/db');

const indexRoutes = require('./routes/index');
const workoutRoutes = require('./routes/workoutRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const mealRoutes = require('./routes/mealRoutes'); // ⬅️ NEW
const { attachUser } = require('./middleware/auth');
const setTheme = require('./middleware/setTheme');

const app = express();

// Connect to MongoDB
connectDB();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body + static
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
// Serve uploaded avatars (and other uploads) as static files
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'devsecret',
    resave: false,
    saveUninitialized: false
  })
);

// Global middleware
app.use(setTheme);
app.use(attachUser);

// Routes
app.use('/', indexRoutes);
app.use('/workouts', workoutRoutes);
app.use('/meals', mealRoutes);     // ⬅️ NEW
app.use('/auth', authRoutes);
app.use('/account', profileRoutes);

// Simple 404
app.use((req, res) => {
  res.status(404).send('Not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});