const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ---- Security Middleware ----

// Rate Limiting: General
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Stricter rate limit for sensitive actions
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded for this action.' }
});

app.use(generalLimiter);
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// CORS — restrict origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Body parsing with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---- Routes ----
app.get('/', (req, res) => {
  res.json({ status: 'DoseBuddy API is running', version: '1.0.0' });
});

app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/pharmacy', require('./routes/pharmacyRoutes'));
app.use('/api/shares', require('./routes/shareRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// ---- Centralized Error Handler ----
app.use((err, req, res, next) => {
  // Log error server-side (without sensitive data)
  console.error(`[${new Date().toISOString()}] Error:`, {
    method: req.method,
    path: req.path,
    status: err.status || 500,
    message: err.message
    // Do NOT log req.body — may contain PHI
  });

  const statusCode = err.status || 500;
  const message = NODE_ENV === 'production'
    ? 'An internal error occurred'
    : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ---- Start Server ----
const server = app.listen(PORT, () => {
  console.log(`[DoseBuddy] Server running on port ${PORT} (${NODE_ENV})`);
});

server.on('error', (e) => {
  console.error('SERVER ERROR:', e.message);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
