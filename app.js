require('dotenv').config();
const express = require('express');
const path = require('path');
const connectDB = require('./config/db');

const indexRoutes = require('./routes/index');
const workoutRoutes = require('./routes/workoutRoutes');

const app = express();

connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRoutes);
app.use('/workouts', workoutRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});