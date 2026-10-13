const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Menu item name is required'],
    trim: true
  },
  slug: {
    type: String,
    required: [true, 'Menu item slug is required'],
    lowercase: true,
    trim: true,
    unique: true,
    index: true
  },
  price: {
    type: Number,
    required: [true, 'Menu item price is required'],
    min: [0, 'Price cannot be negative']
  },
  image: {
    type: String,
    required: [true, 'Menu item image path is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Menu item description is required'],
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category reference is required'],
    index: true
  },
  rating: {
    type: Number,
    min: [0, 'Rating must be at least 0'],
    max: [5, 'Rating cannot exceed 5'],
    default: 0
  },
  reviewCount: {
    type: Number,
    min: [0, 'Review count cannot be negative'],
    default: 0
  },
  ingredients: {
    type: [String],
    default: []
  },
  nutrition: {
    calories: { type: String, default: '' },
    protein: { type: String, default: '' },
    fat: { type: String, default: '' },
    carbs: { type: String, default: '' }
  },
  isAvailable: {
    type: Boolean,
    default: true,
    index: true
  },
  isPopular: {
    type: Boolean,
    default: false,
    index: true
  },
  tags: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Compound index for optimized category filtering queries
menuItemSchema.index({ category: 1, isAvailable: 1 });

menuItemSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
