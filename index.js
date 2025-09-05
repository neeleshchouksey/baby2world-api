const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const religionRoutes = require('./routes/religion.routes');
const session = require('express-session');
const nameRoutes = require('./routes/name.routes');
const godNameRoutes = require('./routes/godName.routes');
const userRoutes = require('./routes/user.routes')
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

// MongoDB se Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/religions', religionRoutes);
app.use('/api/names', nameRoutes);
app.use('/api/godnames', godNameRoutes);
app.use('/api/user', userRoutes);
// Test route to check if server is running
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Server ko start karna
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});