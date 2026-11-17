const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// On a real server, stop straight away if a critical setting is missing or unsafe
const { checkProductionConfig } = require('./utils/checkProductionConfig');
{
  const { errors, warnings } = checkProductionConfig();
  warnings.forEach((w) => console.warn(`WARNING: ${w}`));
  if (errors.length) {
    errors.forEach((e) => console.error(`CONFIG ERROR: ${e}`));
    console.error("Fix the settings above in your host's environment variables, then redeploy.");
    process.exit(1);
  }
}

// mongodb+srv:// needs a DNS SRV lookup. On some Windows setups (e.g. phone hotspots)
// Node picks up 127.0.0.1 as its only DNS server, so the lookup fails with
// "querySrv ECONNREFUSED". Fall back to public resolvers in that case.
// Override with DNS_SERVERS=1.1.1.1,8.8.8.8 in .env if needed.
const dnsServers = process.env.DNS_SERVERS
  ? process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean)
  : null;
const onlyLocalDns = dns.getServers().every((s) => s === '127.0.0.1' || s === '::1');
if (dnsServers || onlyLocalDns) {
  dns.setServers(dnsServers || ['8.8.8.8', '1.1.1.1']);
}

const businessRoutes = require('./routes/businesses');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const supportRoutes = require('./routes/support');
const adminRoutes = require('./routes/admin');
const settings = require('./services/settings');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Photos in /uploads are shown by the app from another origin (Expo web / phones), so allow that
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Don't force https for page files: on a local network (http://192.168.x.x) that would stop the admin
  // page loading on phones. Once hosted behind https, everything is https anyway.
  contentSecurityPolicy: { directives: { upgradeInsecureRequests: null, imgSrc: ["'self'", 'data:', 'blob:', 'https:'] } },
  strictTransportSecurity: process.env.NODE_ENV === 'production',
}));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(morgan('combined'));
// Keep the raw body so Paystack webhook signatures can be checked
app.use(express.json({ limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true }));

// When hosted behind a proxy/load balancer (Render, Railway, Heroku, Nginx), set TRUST_PROXY=1
// so rate limits see each user's real IP instead of the proxy's.
if (process.env.TRUST_PROXY) {
  const v = process.env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(v) ? Number(v) : v === 'true' ? true : v);
}

// Rate limiting. In Ghana many phones share one mobile-network IP, so the general limit is generous;
// the tight limits are on actions worth abusing (guessing owner keys, mass sign-ups, payment spam).
const FIFTEEN_MIN = 15 * 60 * 1000;
const tooMany = (msg) => ({ error: msg || 'Too many requests. Please wait a few minutes and try again.' });
const limit = (opts) => rateLimit({ standardHeaders: true, legacyHeaders: false, ...opts });

app.use('/api/', limit({ windowMs: FIFTEEN_MIN, max: Number(process.env.RATE_LIMIT_MAX) || 1500, message: tooMany() }));

// Wrong owner keys: only failed attempts count, so real owners are never slowed down
app.use('/api/', limit({
  windowMs: FIFTEEN_MIN,
  max: 20,
  skip: (req) => !req.get('x-manage-key'),
  skipSuccessfulRequests: true,
  message: tooMany('Too many wrong owner keys. Please wait 15 minutes and try again.'),
}));

// New business registrations
app.post('/api/businesses', limit({ windowMs: 60 * 60 * 1000, max: Number(process.env.REGISTER_LIMIT_MAX) || 10, message: tooMany('Too many registrations from this network. Please try again in an hour.') }));

// Admin log in: 5 wrong passwords per 15 minutes per IP
app.post('/api/admin/login', limit({ windowMs: FIFTEEN_MIN, max: 5, skipSuccessfulRequests: true, message: tooMany('Too many wrong passwords. Please wait 15 minutes.') }));
app.post('/api/admin/settings/password', limit({ windowMs: FIFTEEN_MIN, max: 5, skipSuccessfulRequests: true, message: tooMany('Too many attempts. Please wait 15 minutes.') }));

// Support messages
app.post('/api/support/requests', limit({ windowMs: 60 * 60 * 1000, max: 5, message: tooMany('You have sent several messages already. Please wait an hour, or contact us by phone or WhatsApp.') }));

// Starting payments (each one sends a prompt to someone's phone)
app.post(['/api/payments/order', '/api/payments/plan'], limit({ windowMs: FIFTEEN_MIN, max: 20, message: tooMany('Too many payment attempts. Please wait a few minutes.') }));

// Private admin page (password protected; never listed in search engines)
app.get('/admin', (req, res, next) => (req.originalUrl === '/admin' ? res.redirect(301, '/admin/') : next()));
app.use('/admin', (req, res, next) => { res.set('X-Robots-Tag', 'noindex, nofollow'); res.set('Cache-Control', 'no-store'); next(); }, express.static(path.join(__dirname, 'admin')));

// The public website (website/ folder next to backend/): home, browse, business pages, owner tools
const WEBSITE_DIR = path.join(__dirname, '..', 'website');
// Pages, styles and scripts: browsers must check for a newer version every time (cheap 304 if unchanged),
// so phones see website updates straight away. Photos can be kept for a day.
app.use(express.static(WEBSITE_DIR, {
  extensions: ['html'],
  index: 'index.html',
  setHeaders: (res, filePath) => {
    res.set('Cache-Control', /\.(html|css|js)$/i.test(filePath) ? 'no-cache' : 'public, max-age=86400');
  },
}));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB, retrying if the first attempt fails (e.g. the network isn't up yet).
// Once connected, mongoose reconnects by itself after drops.
const connectWithRetry = (attempt = 1) => {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vendora-africa', {
    serverSelectionTimeoutMS: 10000,
  })
    .then(() => { console.log('MongoDB connected successfully'); return settings.refresh(true); })
    .catch((error) => {
      const wait = Math.min(30, attempt * 5);
      console.error(`MongoDB connection error: ${error.message}. Retrying in ${wait}s...`);
      setTimeout(() => connectWithRetry(attempt + 1), wait * 1000);
    });
};
connectWithRetry();

// No database = no service. Data is never kept in temporary memory in real use, because it would be
// lost on restart. (For local testing only, ALLOW_MEMORY_STORE=true lets the API run without MongoDB.)
const allowMemoryStore = process.env.ALLOW_MEMORY_STORE === 'true';
const requireDatabase = (req, res, next) => {
  if (mongoose.connection.readyState === 1 || allowMemoryStore) return next();
  res.status(503).json({ error: 'Vendora is temporarily unavailable. Please try again in a moment.' });
};
app.use('/api/businesses', requireDatabase);
app.use('/api/payments', (req, res, next) => (req.path === '/config' ? next() : requireDatabase(req, res, next)));
// Support messages are saved in MongoDB only (never in temporary memory)
app.use('/api/support', (req, res, next) => (req.path === '/info' || mongoose.connection.readyState === 1 ? next() : res.status(503).json({ error: 'Vendora is temporarily unavailable. Please try again in a moment.' })));

mongoose.connection.on('error', (error) => {
  console.error('MongoDB runtime error:', error.message);
});

// Prices can be changed on the admin page: keep the copy used by these routes up to date
app.use(['/api/businesses', '/api/payments'], (req, res, next) => { settings.refresh().then(() => next(), () => next()); });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/admin', requireDatabase, adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
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
      payments: '/api/payments',
      support: '/api/support',
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
  Website: http://localhost:${PORT}/
  Admin:   http://localhost:${PORT}/admin
  `);
  // This computer's address on the current Wi-Fi / hotspot (it changes when you switch networks)
  const lan = Object.values(require('os').networkInterfaces()).flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.'))
    .map((i) => i.address);
  if (lan.length) {
    console.log('  On a phone connected to the same Wi-Fi / hotspot:');
    lan.forEach((ip) => {
      console.log(`    Website:          http://${ip}:${PORT}/`);
      console.log(`    Admin page:       http://${ip}:${PORT}/admin`);
      console.log(`    Customer web app: http://${ip}:8081   (while "npx expo start --web" is running)`);
    });
    console.log('');
  }
});

module.exports = app;
