const mongoose = require('mongoose');

async function connectDB() {
  try {
    let uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    // If someone accidentally pasted "MONGO_URI=..." into the value,
    // strip everything before the first "mongodb".
    const idx = uri.indexOf('mongodb');
    if (idx > 0) {
      uri = uri.slice(idx);
    }

    console.log('Connecting to MongoDB with URI:', uri.slice(0, 40) + '...');

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('mongo connected');
  } catch (err) {
    console.error('db error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;