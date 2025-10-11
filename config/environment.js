/**
 * Backend Environment Configuration
 * Handles development and production environment settings
 */

require('dotenv').config();

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Database Configuration
const DB_CONFIG = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'babynames_db',
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: false
    } : false,
  },
  production: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'babynames_db',
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    } : false,
  }
};

// Server Configuration
const SERVER_CONFIG = {
  development: {
    port: parseInt(process.env.PORT || '5000'),
    host: process.env.HOST || 'localhost',
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
      ],
      credentials: true,
    }
  },
  production: {
    port: parseInt(process.env.PORT || '5000'),
    host: process.env.HOST || '0.0.0.0',
    cors: {
      origin: [
        'https://baby2world.com',
        'https://www.baby2world.com',
        'http://baby2world.com',
        'http://www.baby2world.com',
      ],
      credentials: true,
    }
  }
};

// JWT Configuration
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your_jwt_secret_here',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
};

// Google OAuth Configuration
const GOOGLE_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: isDevelopment 
    ? 'http://localhost:5000/api/auth/google/callback'
    : 'https://api.baby2world.com/api/auth/google/callback',
};

// Admin Configuration
const ADMIN_CONFIG = {
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'admin123',
};

// Email Configuration
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587'),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.FROM_EMAIL || 'noreply@baby2world.com',
};

// Current environment config
const currentDB = isProduction ? DB_CONFIG.production : DB_CONFIG.development;
const currentServer = isProduction ? SERVER_CONFIG.production : SERVER_CONFIG.development;

// Export configuration
const config = {
  // Environment info
  isDevelopment,
  isProduction,
  environment: process.env.NODE_ENV || 'development',
  
  // Database settings
  database: currentDB,
  
  // Server settings
  server: currentServer,
  
  // JWT settings
  jwt: JWT_CONFIG,
  
  // Google OAuth
  google: GOOGLE_CONFIG,
  
  // Admin settings
  admin: ADMIN_CONFIG,
  
  // Email settings
  email: EMAIL_CONFIG,
  
  // Feature flags
  features: {
    enableEmail: !!process.env.SMTP_HOST,
    enableSSL: !!process.env.SSL_CERT_PATH,
    enableDebug: isDevelopment,
  },
};

// Console logging for development
if (config.isDevelopment) {
  console.log('🔧 Backend Environment Configuration:', {
    environment: config.environment,
    port: config.server.port,
    host: config.server.host,
    database: config.database.database,
    corsOrigins: config.server.cors.origin,
    features: config.features,
  });
}

module.exports = config;
