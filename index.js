const express = require('express');
const { query } = require('./config/database');
const cors = require('cors');
const passport = require('passport');
const religionRoutes = require('./routes/religion.routes');
const session = require('express-session');
const nameRoutes = require('./routes/name.routes');
const godNameRoutes = require('./routes/godname.routes');
const userRoutes = require('./routes/user.routes')
const nicknameRoutes = require('./routes/nickname.routes');
const config = require('./config/environment');
require('dotenv').config();

// Passport Config (yeh line passport-setup.js file ko execute karti hai)
require('./config/passport-setup'); 

const authRoutes = require('./routes/auth.routes');

const app = express();
const PORT = config.server.port;
const HOST = config.server.host;

// CORS Configuration - Environment based
app.use(cors({
  origin: config.server.cors.origin,
  credentials: config.server.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Middleware
app.use(express.json());

// Express Session Middleware (Passport OAuth ke liye zaroori)
app.use(
  session({
    secret: config.jwt.secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: config.isProduction, // HTTPS only in production
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
app.use('/api/names', nameRoutes);
app.use('/api/god-names', godNameRoutes);
app.use('/api/user', userRoutes);
app.use('/api/nicknames', nicknameRoutes);
// Test route to check if server is running
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Server ko start karna
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on http://${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${config.environment}`);
  console.log(`🔗 CORS Origins: ${config.server.cors.origin.join(', ')}`);
  if (config.isDevelopment) {
    console.log(`📊 Debug Mode: Enabled`);
    console.log(`🔧 Features: ${JSON.stringify(config.features, null, 2)}`);
  }
});