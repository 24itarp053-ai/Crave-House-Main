const dotenv = require('dotenv');
// 1. Load environment variables before requiring any local config/route modules
dotenv.config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// 2. Create Express application
const app = express();

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Build allowed origins list — always includes dev (5173) and preview (4173)
const ALLOWED_ORIGINS = [
  CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean);

// 3. Enable JSON parsing middleware
app.use(express.json());

// 4. Configure CORS
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} is not allowed`));
  },
  credentials: true
}));

// 6. Register /api/health
app.get('/api/health', (req, res) => {
  // mongoose.connection.readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const isDbConnected = mongoose.connection.readyState === 1;

  if (isDbConnected) {
    return res.status(200).json({
      success: true,
      message: "Crave House API is running",
      database: "connected"
    });
  } else {
    return res.status(503).json({
      success: false,
      message: "Crave House API is running but Database connection is not ready",
      database: "disconnected"
    });
  }
});

// Register authentication routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/payments', paymentRoutes);


// 7. Register API 404 handler
app.use('/api', (req, res, next) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

// 8. Register centralized error handler
app.use((err, req, res, next) => {
  // Server-side logging of detailed error/stack for development
  console.error('Centralized Error Handler:', err.stack || err);

  let statusCode = err.status || err.statusCode || 500;
  let message = "Something went wrong";

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Email already registered';
  }

  res.status(statusCode).json({
    success: false,
    message: message
  });
});

// 5. Connect to MongoDB and 9. Start server
const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Start listening on port
    app.listen(PORT, () => {
      console.log(`Crave House API running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
