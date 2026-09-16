const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const businessRoutes = require('./routes/businesses');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vendora-africa', {
  serverSelectionTimeoutMS: 5000,
})
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
  });

mongoose.connection.on('error', (error) => {
  console.error('MongoDB runtime error:', error.message);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'VENDORA AFRICA API',
    version: '1.0.0',
    description: 'Africa\'s Business Marketplace Backend API',
    endpoints: {
      auth: '/api/auth',
      businesses: '/api/businesses',
      users: '/api/users',
      health: '/api/health'
    },
    documentation: 'https://api.vendora.africa/docs'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      '/api/auth',
      '/api/businesses',
      '/api/users',
      '/api/health'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  VENDORA AFRICA API Server
  ========================
  Environment: ${process.env.NODE_ENV || 'development'}
  Port: ${PORT}
  Health: http://localhost:${PORT}/api/health
  API Docs: http://localhost:${PORT}/api
  `);
});

module.exports = app;
