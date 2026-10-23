const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

const seedUsers = async () => {
  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoURI) {
    console.error('Error: MONGODB_URI (or MONGO_URI) is not defined in environment variables.');
    process.exit(1);
  }

  try {
    // Connect to database
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected for seeding users...');

    const isProduction = process.env.NODE_ENV === 'production';
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@cravehouse.demo';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'password123';
    const ownerEmail = process.env.SEED_OWNER_EMAIL || 'owner@cravehouse.demo';
    const ownerPassword = process.env.SEED_OWNER_PASSWORD || 'password123';

    if (isProduction) {
      if (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_OWNER_PASSWORD) {
        console.error('❌ [Security] Refusing to seed accounts in production without explicit SEED_ADMIN_PASSWORD and SEED_OWNER_PASSWORD.');
        process.exit(1);
      }
      if (adminPassword === 'password123' || ownerPassword === 'password123') {
        console.error('❌ [Security] Refusing to seed accounts with insecure default demo password ("password123") in production.');
        process.exit(1);
      }
      if (adminPassword === ownerPassword) {
        console.error('❌ [Security] Refusing to seed accounts in production when SEED_ADMIN_PASSWORD and SEED_OWNER_PASSWORD are identical. Initial staff accounts require distinct, unique passwords.');
        process.exit(1);
      }
      if (adminEmail.toLowerCase() === ownerEmail.toLowerCase()) {
        console.error('❌ [Security] Refusing to seed accounts when SEED_ADMIN_EMAIL and SEED_OWNER_EMAIL are identical. Initial staff accounts require distinct email addresses.');
        process.exit(1);
      }
    }

    // Privileged seed users
    const seedData = [
      {
        name: process.env.SEED_ADMIN_NAME || 'Restaurant Admin',
        email: adminEmail,
        password: adminPassword,
        phone: process.env.SEED_ADMIN_PHONE || '1111111111',
        role: 'admin'
      },
      {
        name: process.env.SEED_OWNER_NAME || 'Restaurant Owner',
        email: ownerEmail,
        password: ownerPassword,
        phone: process.env.SEED_OWNER_PHONE || '2222222222',
        role: 'owner'
      }
    ];

    for (const item of seedData) {
      const exists = await User.findOne({ email: item.email });
      if (exists) {
        console.log(`User ${item.email} already exists. Skipping.`);
      } else {
        // Creates and automatically hashes the password using Mongoose hook
        await User.create(item);
        console.log(`Seed user created: ${item.email} (${item.role})`);
      }
    }

    console.log('User seeding completed successfully.');
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`Error during user seeding: ${error.message}`);
    process.exit(1);
  }
};

seedUsers();
