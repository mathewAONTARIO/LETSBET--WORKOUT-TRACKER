const mongoose = require('mongoose');

async function connectDB() {
  try {
    // Support BOTH env var names so deployments don’t break
    let uri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!uri) {
      throw new Error(
        'MongoDB URI missing. Set MONGODB_URI or MONGO_URI in environment variables.'
      );
    }

    // If someone pasted "MONGO_URI=mongodb+srv://..." into EB by mistake
    const idx = uri.indexOf('mongodb');
    if (idx > 0) {
      uri = uri.slice(idx);
    }

    console.log('Connecting to MongoDB...');
    console.log('Mongo URI (masked):', uri.slice(0, 30) + '...');

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // fail fast instead of hanging EB
    });

    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    // EB / prod must exit so nginx stops sending traffic
    process.exit(1);
  }
}

module.exports = connectDB;