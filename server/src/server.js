const dotenv = require('dotenv');
// 1. Load environment variables before requiring any local config/route modules
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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
const tableRoutes = require('./routes/tableRoutes');
const configRoutes = require('./routes/configRoutes');
const { startRetryRunner, stopRetryRunner } = require('./services/emailService');

// 2. Create Express application
const app = express();

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const RESTAURANT_NAME = process.env.RESTAURANT_NAME || 'Crave House';
const isProduction = process.env.NODE_ENV === 'production';

// Build allowed origins list from comma-separated CLIENT_URL, dev (5173), and preview (4173)
const configuredOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = [
  ...new Set([
    ...configuredOrigins,
    'http://localhost:5173',
    'http://localhost:4173'
  ])
];

// Security Headers via Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Body parsing with payload size limits and raw-body retention for webhook signatures
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    // Retain exact unparsed buffer for cryptographic webhook signature verification
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Configure CORS
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests with no origin (curl, server-to-server, health probes)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    // In development only, allow local development ports
    if (!isProduction && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    callback(new Error(`CORS: origin ${origin} is not allowed`));
  },
  credentials: true
}));

// Rate limiting: General API limiter (skips Razorpay webhook callbacks)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // 600 requests per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.originalUrl && req.originalUrl.includes('/api/payments/webhook'),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  }
});

// Rate limiting: Strict limiter for authentication endpoints (prevent brute-forcing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // 25 attempts per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  }
});

// 6. Register /api/health (unthrottled for uptime probes)
app.get('/api/health', (req, res) => {
  // mongoose.connection.readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const isDbConnected = mongoose.connection.readyState === 1;

  if (isDbConnected) {
    return res.status(200).json({
      success: true,
      message: `${RESTAURANT_NAME} API is running`,
      database: "connected"
    });
  } else {
    return res.status(503).json({
      success: false,
      message: `${RESTAURANT_NAME} API is running but Database connection is not ready`,
      database: "disconnected"
    });
  }
});

// Apply global rate limiting to all other /api endpoints
app.use('/api', apiLimiter);

// Register authentication routes with dedicated brute-force rate limiter
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/config', configRoutes);


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
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    if (field === 'tableNumber') {
      message = 'Table identifier already exists';
    } else if (field === 'email') {
      message = 'Email already registered';
    } else {
      message = `Duplicate key error on field: ${field || 'unknown'}`;
    }
  }

  res.status(statusCode).json({
    success: false,
    message: message
  });
});

// Validate essential production configuration without printing secrets
function validateProductionConfig() {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoURI || typeof mongoURI !== 'string' || mongoURI.trim().length === 0) {
    console.error('❌ [FATAL CONFIG ERROR] MONGODB_URI (or MONGO_URI) is required in production.');
    process.exit(1);
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (
    !jwtSecret ||
    typeof jwtSecret !== 'string' ||
    jwtSecret.trim().length === 0 ||
    jwtSecret === 'replace_with_a_strong_random_secret_at_least_32_characters'
  ) {
    console.error('❌ [FATAL CONFIG ERROR] JWT_SECRET is missing or using insecure default placeholder in production.');
    process.exit(1);
  }

  return true;
}

app.validateProductionConfig = validateProductionConfig;

// 5. Connect to MongoDB and 9. Start server
const startServer = async () => {
  try {
    // Validate essential production settings before connecting
    validateProductionConfig();

    // Connect to MongoDB first
    await connectDB();

    // Start listening on port
    const serverInstance = app.listen(PORT, () => {
      console.log(`${RESTAURANT_NAME} API running on port ${PORT}`);
      // Start periodic background email retry runner
      startRetryRunner();
    });

    const shutdown = async (signal) => {
      console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
      stopRetryRunner();
      serverInstance.close(async () => {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect();
        }
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
