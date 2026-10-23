/**
 * seedTables.js
 * Initial seed script for Crave House table layout.
 */

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Table = require('../models/Table');

dotenv.config();

const initialTables = [
  { tableNumber: 'T01', name: 'Table T01', capacity: 2,  area: 'Main Hall',      isActive: true, description: 'Cozy two-seater near window' },
  { tableNumber: 'T02', name: 'Table T02', capacity: 4,  area: 'Main Hall',      isActive: true, description: 'Family dining table' },
  { tableNumber: 'T03', name: 'Table T03', capacity: 4,  area: 'Main Hall',      isActive: true, description: 'Central dining table' },
  { tableNumber: 'T04', name: 'Table T04', capacity: 2,  area: 'Outdoor Patio',  isActive: true, description: 'Open-air patio two-seater' },
  { tableNumber: 'T05', name: 'Table T05', capacity: 6,  area: 'Main Hall',      isActive: true, description: 'Six-seater booth table' },
  { tableNumber: 'T06', name: 'Table T06', capacity: 6,  area: 'Outdoor Patio',  isActive: true, description: 'Outdoor large patio dining' },
  { tableNumber: 'T07', name: 'Table T07', capacity: 8,  area: 'Terrace',        isActive: true, description: 'Rooftop terrace dining' },
  { tableNumber: 'T08', name: 'Table T08', capacity: 8,  area: 'Terrace',        isActive: true, description: 'Rooftop terrace banquet table' },
  { tableNumber: 'T09', name: 'Table T09', capacity: 4,  area: 'Bar Area',       isActive: false, description: 'Bar section high-top table' },
  { tableNumber: 'T10', name: 'Table T10', capacity: 2,  area: 'Bar Area',       isActive: true, description: 'Intimate high-top two-seater' },
  { tableNumber: 'T11', name: 'Table T11', capacity: 10, area: 'Private Dining', isActive: true, description: 'Executive private dining suite' },
  { tableNumber: 'T12', name: 'Table T12', capacity: 10, area: 'Private Dining', isActive: true, description: 'Celebration private dining suite' },
];

async function seedTables() {
  const isProduction = process.env.NODE_ENV === 'production';
  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || (isProduction ? null : 'mongodb://127.0.0.1:27017/crave_house');

  if (!mongoURI) {
    console.error('❌ Error: MONGODB_URI (or MONGO_URI) is not defined in environment variables. Refusing to connect to fallback database in production.');
    if (require.main === module) {
      process.exit(1);
    }
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB.');

    for (const t of initialTables) {
      await Table.findOneAndUpdate(
        { tableNumber: t.tableNumber },
        { $setOnInsert: t },
        { upsert: true, new: true }
      );
    }

    const count = await Table.countDocuments();
    console.log(`Seeded/verified ${count} tables in database.`);
  } catch (err) {
    console.error('Error seeding tables:', err.message || err);
    if (require.main === module) {
      process.exit(1);
    }
    throw err;
  } finally {
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('Database connection closed.');
    }
  }
}

if (require.main === module) {
  seedTables();
}

module.exports = { seedTables, initialTables };
