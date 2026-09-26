const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const db = require('./db');
const {
  helmetMiddleware,
  apiLimiter,
  inputSanitizer,
  csrfProtection
} = require('./middleware/security');

// Import Route Handlers
const authRoutes = require('./routes/auth.routes');
const booksRoutes = require('./routes/books.routes');
const borrowRoutes = require('./routes/borrow.routes');
const adminRoutes = require('./routes/admin.routes');
const securityDemoRoutes = require('./routes/securityDemo.routes');

const app = express();

// 1. Security Headers (Helmet.js)
app.use(helmetMiddleware);

// 2. CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  config.security.corsOrigin
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS security policy.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'x-library-csrf']
}));

// 3. Request parsing & limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// 4. Input Sanitization (Prevents XSS Injection)
app.use(inputSanitizer);

// 5. CSRF Protection
app.use(csrfProtection);

// 6. Global API Rate Limiter
app.use('/api', apiLimiter);

// 7. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    databaseEngine: db.getDbType(),
    securityHeaders: 'active',
    version: '1.0.0'
  });
});

// 8. Mount Domain Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/borrow', borrowRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/security-demo', securityDemoRoutes);

// 9. 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Resource not found at route ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND'
  });
});

// 10. Centralized Secure Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[UNCAUGHT SERVER ERROR]', err.message);
  
  // Guard against leaking internal stack traces
  const isDev = process.env.NODE_ENV !== 'production';
  return res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    ...(isDev && { stack: err.stack })
  });
});

// Start Server after Database Bootstraps
async function startServer() {
  try {
    console.log('[BOOT] Initializing Smart Library Database engine...');
    const engine = await db.initializeDatabase();
    console.log(`[BOOT] Database ready (Engine: ${engine.toUpperCase()})`);

    const server = app.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(` SMART LIBRARY BOOK MANAGEMENT SYSTEM - SECURE API `);
      console.log(`====================================================`);
      console.log(` Server running on http://localhost:${config.port}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Database:    ${engine.toUpperCase()}`);
      console.log(` Security:    Helmet, JWT, bcrypt, RateLimit, CSRF Active`);
      console.log(`====================================================`);
    });

    return server;
  } catch (err) {
    console.error('[BOOT FATAL ERROR] Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
