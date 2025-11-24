// scripts/migratePlaintextPasswords.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const SALT_ROUNDS = 10;

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({});
    console.log(`Found ${users.length} users`);

    let migrated = 0;

    for (const user of users) {
      const pwd = user.password;
      if (!pwd) continue;

      const looksHashed =
        typeof pwd === 'string' &&
        (pwd.startsWith('$2a$') || pwd.startsWith('$2b$') || pwd.startsWith('$2y$'));

      if (!looksHashed) {
        // Treat current value as plain text and hash it
        const newHash = await bcrypt.hash(pwd, SALT_ROUNDS);
        user.password = newHash;
        user.passwordVersion = 1;
        await user.save();
        migrated++;
        console.log(`Migrated user ${user.email}`);
      }
    }

    console.log(`Done. Migrated ${migrated} users.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

run();