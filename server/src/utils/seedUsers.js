const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

const seedUsers = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error('Error: MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    // Connect to database
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected for seeding users...');

    // Privileged seed users
    const seedData = [
      {
        name: 'Demo Admin',
        email: 'admin@cravehouse.demo',
        password: 'password123',
        phone: '1111111111',
        role: 'admin'
      },
      {
        name: 'Demo Owner',
        email: 'owner@cravehouse.demo',
        password: 'password123',
        phone: '2222222222',
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
