const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reservationId: {
      type: String,
      required: true,
      unique: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: String,
      required: true
    },
    time: {
      type: String,
      required: true
    },
    guests: {
      type: Number,
      required: true,
      min: 1
    },
    specialRequest: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Cancelled'],
      default: 'Pending'
    },
    table: {
      type: String,
      default: 'T-TBD'
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      default: null
    },
    durationMinutes: {
      type: Number,
      default: 90,
      min: 30,
      max: 240
    },
    notifications: {
      created: {
        status: {
          type: String,
          enum: ['none', 'pending', 'sending', 'sent', 'failed'],
          default: 'none'
        },
        attempts: { type: Number, default: 0 },
        sentAt: { type: Date },
        lastAttemptAt: { type: Date },
        lastError: { type: String },
        messageId: { type: String }
      },
      statusChange: {
        status: {
          type: String,
          enum: ['none', 'pending', 'sending', 'sent', 'failed'],
          default: 'none'
        },
        attempts: { type: Number, default: 0 },
        lastStatusNotified: { type: String },
        sentAt: { type: Date },
        lastAttemptAt: { type: Date },
        lastError: { type: String },
        messageId: { type: String }
      },
      createdSent: { type: Boolean, default: false },
      createdSentAt: { type: Date },
      statusChangedSent: { type: Boolean, default: false },
      lastStatusNotified: { type: String },
      statusChangedSentAt: { type: Date }
    }
  },
  {
    timestamps: true
  }
);

// Performance & Concurrency Indexes
reservationSchema.index({ tableId: 1, date: 1, status: 1 });
reservationSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
