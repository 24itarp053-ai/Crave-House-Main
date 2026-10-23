const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: String,
      required: [true, 'Table number is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      trim: true,
      default: function() {
        return `Table ${this.tableNumber}`;
      }
    },
    capacity: {
      type: Number,
      required: [true, 'Seating capacity is required'],
      min: [1, 'Capacity must be at least 1 guest'],
      max: [50, 'Capacity cannot exceed 50 guests'],
      validate: {
        validator: Number.isInteger,
        message: 'Capacity must be a whole number'
      }
    },
    area: {
      type: String,
      trim: true,
      enum: {
        values: ['Main Hall', 'Outdoor Patio', 'Terrace', 'Private Dining', 'Bar Area', 'Balcony'],
        message: 'Invalid area. Must be Main Hall, Outdoor Patio, Terrace, Private Dining, Bar Area, or Balcony'
      },
      default: 'Main Hall'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound index for active capacity lookups
tableSchema.index({ isActive: 1, capacity: 1 });

module.exports = mongoose.model('Table', tableSchema);
