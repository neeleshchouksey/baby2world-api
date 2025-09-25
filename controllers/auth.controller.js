const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

// --- HELPER FUNCTION: Common Login Logic ---
const loginUser = async (req, res, requiredRole) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (user.role !== requiredRole) {
      return res.status(403).json({ message: `Access denied. This login is for ${requiredRole}s only.` });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const payload = { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      name: user.name 
    };
    
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not set in environment variables!');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const token = jwt.sign(payload, jwtSecret, { expiresIn: '1d' });

    res.status(200).json({ 
      message: 'Logged in successfully!', 
      token,
      user: user.toJSON() // Send user data without password
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// --- EXPORTED CONTROLLERS ---

// Admin Login Logic
exports.adminLogin = (req, res) => {
  loginUser(req, res, 'admin');
};

// User Login Logic  
exports.userLogin = (req, res) => {
  loginUser(req, res, 'user');
};

// Change Password Logic (for logged-in users)
exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id; // From JWT middleware

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Old password and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.password) {
      return res.status(400).json({ 
        message: 'Password change not available. You signed up using Google authentication.' 
      });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Optional: Add signup endpoint
exports.signup = async (req, res) => {
  const { name, email, password, role = 'user' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    // Create new user
    const user = await User.createWithPassword({ name, email, password, role });

    const payload = { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      name: user.name 
    };

    const jwtSecret = process.env.JWT_SECRET;
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '1d' });

    res.status(201).json({ 
      message: 'User created successfully!', 
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};