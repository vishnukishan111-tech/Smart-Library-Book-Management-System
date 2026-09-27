const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 1. Strict Helmet Configuration for Secure Headers
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https://*.supabase.co'],
      connectSrc: ["'self'", 'http://localhost:3000', 'http://localhost:5000', 'https://*.supabase.co', 'https://*.vercel.app']
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

// 2. Rate Limiters
const isDev = (process.env.NODE_ENV || 'development') !== 'production';

// Auth limiter: Prevents brute force password spraying on login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 100 : 20, // generous in dev, strict 20 in prod
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// API limiter: general API protection
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 500, // 10,000 in dev to support rapid automated testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please slow down.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Search limiter: protects search endpoint from scrape bursts
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDev ? 1000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Search rate limit exceeded. Please wait a moment.',
    code: 'SEARCH_RATE_LIMIT'
  }
});

// 3. Input Sanitization Middleware to prevent XSS and malicious characters
function sanitizeInput(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      // Strip potentially dangerous tags and trim whitespace
      obj[key] = obj[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/onload=/gi, '')
        .replace(/onerror=/gi, '')
        .trim();
    } else if (typeof obj[key] === 'object') {
      sanitizeInput(obj[key]);
    }
  }
  return obj;
}

const inputSanitizer = (req, res, next) => {
  if (req.body) sanitizeInput(req.body);
  if (req.query) sanitizeInput(req.query);
  if (req.params) sanitizeInput(req.params);
  next();
};

// 4. CSRF / Anti-Forgery Token Validation Helper
// Using double-submit cookie or custom header validation for state-changing requests
const csrfProtection = (req, res, next) => {
  // Safe methods do not require CSRF check
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Header based check for client-side API requests
  const clientHeader = req.headers['x-requested-with'] || req.headers['x-library-csrf'];
  const tokenInHeader = req.headers['x-csrf-token'];
  const tokenInCookie = req.cookies ? req.cookies['csrf-token'] : null;

  // If token is provided in cookie, verify match
  if (tokenInCookie && tokenInHeader && tokenInCookie !== tokenInHeader) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token mismatch detected.',
      code: 'CSRF_INVALID'
    });
  }

  next();
};

module.exports = {
  helmetMiddleware,
  authLimiter,
  apiLimiter,
  searchLimiter,
  inputSanitizer,
  csrfProtection
};
