const express = require('express');
const { query } = require('./config/database');
const cors = require('cors');
const passport = require('passport');
const religionRoutes = require('./routes/religion.routes');
const originRoutes = require('./routes/origin.routes');
const session = require('express-session');
const nameRoutes = require('./routes/name.routes');
const godNameRoutes = require('./routes/godname.routes');
const userRoutes = require('./routes/user.routes')
const nicknameRoutes = require('./routes/nickname.routes');
const subGodNameRoutes = require('./routes/subgodname.routes');
require('dotenv').config();

// Passport Config (yeh line passport-setup.js file ko execute karti hai)
require('./config/passport-setup'); 

const authRoutes = require('./routes/auth.routes');
const csvImportRoutes = require('./routes/csvImport.routes');
const termsAndConditionsRoutes = require('./routes/termsAndConditions.routes');
const pageRoutes = require('./routes/page.routes');
const uploadRoutes = require('./routes/upload.routes');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// CORS Configuration - Environment based
let corsOrigins;
if (process.env.NODE_ENV === 'production') {
  corsOrigins = ['https://baby2world.com', 'https://www.baby2world.com'];
} else if (process.env.NODE_ENV === 'staging') {
  // Support both environment variable and default staging URLs
  const stagingOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['https://staging.baby2world.com', 'https://www-staging.baby2world.com'];
  corsOrigins = stagingOrigins;
} else {
  corsOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];
}

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Express Session Middleware (Passport OAuth ke liye zaroori)
app.use(
  session({
    secret: process.env.JWT_SECRET || 'your_jwt_secret_here',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// PostgreSQL Connection Test
query('SELECT NOW()')
  .then(() => console.log('PostgreSQL connected successfully.'))
  .catch(err => console.error('PostgreSQL connection error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/religions', religionRoutes);
app.use('/api/origins', originRoutes);
app.use('/api/names', nameRoutes);
app.use('/api/god-names', godNameRoutes);
app.use('/api/user', userRoutes);
app.use('/api/nicknames', nicknameRoutes);
app.use('/api/subgodnames', subGodNameRoutes);
app.use('/api/csv-import', csvImportRoutes);
app.use('/api/terms-and-conditions', termsAndConditionsRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/upload', uploadRoutes);

// Serve uploaded images statically
app.use('/uploads', express.static('uploads'));
// Test route to check if server is running
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Server ko start karna
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on http://${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS Origins: ${corsOrigins.join(', ')}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📊 Debug Mode: Enabled`);
  }
});