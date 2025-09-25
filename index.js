const express = require('express');
const { query } = require('./config/database');
const cors = require('cors');
const passport = require('passport');
const religionRoutes = require('./routes/religion.routes');
const session = require('express-session');
const nameRoutes = require('./routes/name.routes');
const godNameRoutes = require('./routes/godName.routes');
const userRoutes = require('./routes/user.routes')
const nicknameRoutes = require('./routes/nickname.routes');
require('dotenv').config();

// Passport Config (yeh line passport-setup.js file ko execute karti hai)
require('./config/passport-setup'); 

const authRoutes = require('./routes/auth.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - Yaha changes kiye hain
app.use(cors({
  origin: 'http://localhost:3000', // React app ka URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());

// Express Session Middleware (Passport OAuth ke liye zaroori)
app.use(
  session({
    secret: 'a_secret_key_for_session',
    resave: false,
    saveUninitialized: true,
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
app.use('/api/godnames', godNameRoutes);
app.use('/api/user', userRoutes);
app.use('/api/nicknames', nicknameRoutes);
// Test route to check if server is running
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Server ko start karna
app.listen(PORT, '0.0.0.0',() => {
  console.log(`Server is running on http://localhost:${PORT}`);
});