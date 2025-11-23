require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const connectDB = require('./config/db');

const indexRoutes = require('./routes/index');
const workoutRoutes = require('./routes/workoutRoutes');
const authRoutes = require('./routes/authRoutes');
const { attachUser } = require('./middleware/auth');

const app = express();

connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'devsecret',
    resave: false,
    saveUninitialized: false
  })
);

app.use(attachUser);

app.use('/', indexRoutes);
app.use('/workouts', workoutRoutes);
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});