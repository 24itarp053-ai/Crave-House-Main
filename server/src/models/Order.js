const mongoose = require('mongoose');

// Item snapshot schema for storing order details at the time of purchase
const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: false // Optional to prevent broken history if the product is deleted from the menu
  },
  name: {
    type: String,
    required: [true, 'Order item name is required'],
    trim: true
  },
  image: {
    type: String,
    required: [true, 'Order item image is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Order item price is required'],
    min: [0, 'Item price cannot be negative']
  },
  quantity: {
    type: Number,
    required: [true, 'Order item quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  subtotal: {
    type: Number,
    required: [true, 'Order item subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  }
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  orderNumber: {
    type: String,
    required: [true, 'Order number is required'],
    unique: true,
    index: true
  },
  customer: {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: [true, 'Customer phone number is required'],
      trim: true
    }
  },
  orderType: {
    type: String,
    required: [true, 'Order type is required'],
    enum: {
      values: ['delivery', 'pickup', 'dine-in'],
      message: 'Order type must be delivery, pickup, or dine-in'
    }
  },
  address: {
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    instructions: { type: String, trim: true }
  },
  dineInDetails: {
    tableNumber: { type: String, trim: true },
    numberOfGuests: { type: Number, min: [1, 'Number of guests must be at least 1'] },
    dineInInstructions: { type: String, trim: true }
  },
  items: {
    type: [orderItemSchema],
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Order must contain at least one item'
    }
  },
  pricing: {
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative']
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative']
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: [0, 'Delivery fee cannot be negative']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative']
    },
    total: {
      type: Number,
      required: [true, 'Total is required'],
      min: [0, 'Total cannot be negative']
    }
  },
  payment: {
    method: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: ['COD', 'Card', 'UPI', 'NetBanking', 'online', 'Online'],
        message: 'Invalid payment method'
      },
      default: 'COD'
    },
    status: {
      type: String,
      required: [true, 'Payment status is required'],
      enum: {
        values: ['Pending', 'Paid', 'Failed', 'Refunded'],
        message: 'Invalid payment status'
      },
      default: 'Pending'
    },
    transactionId: {
      type: String,
      trim: true
    }
  },
  status: {
    type: String,
    required: [true, 'Order status is required'],
    enum: {
      values: ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'],
      message: 'Invalid order status'
    },
    default: 'Pending',
    index: true
  }
}, {
  timestamps: true
});

// Require specific details based on orderType
orderSchema.pre('validate', function(next) {
  if (this.orderType === 'delivery') {
    if (!this.address || !this.address.address || !this.address.city || !this.address.pincode) {
      this.invalidate('address', 'Street address, city, and pincode are required for delivery orders');
    }
  } else if (this.orderType === 'dine-in') {
    if (!this.dineInDetails || !this.dineInDetails.tableNumber || !this.dineInDetails.numberOfGuests) {
      this.invalidate('dineInDetails', 'Table number and number of guests are required for dine-in orders');
    }
  }
  next();
});

// Index to optimize sorting by order date (most recent first)
orderSchema.index({ createdAt: -1 });

// Ensure JSON serialization maps _id to id
orderSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Order', orderSchema);
