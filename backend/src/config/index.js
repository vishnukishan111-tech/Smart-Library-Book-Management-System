require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'smart_library_access_secret_super_secure_key_2026',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'smart_library_refresh_secret_ultra_secure_key_2026',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
  },
  security: {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
    bcryptRounds: 10,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },
  supabase: {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  }
};
