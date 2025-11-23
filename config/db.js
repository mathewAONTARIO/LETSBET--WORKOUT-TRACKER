const mongoose = require('mongoose');

const connectDB = () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('mongo connected'))
    .catch((err) => {
      console.log('db error:', err.message);
      process.exit(1);
    });
};

module.exports = connectDB;