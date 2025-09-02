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
      return res.status(403).json({ message: 'Access denied for this role.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const payload = { id: user._id, email: user.email, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({ message: 'Logged in successfully!', token: token });
  } catch (error) {
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
  const userId = req.user.id;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Old password and new password are required.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (!user.password) {
      return res.status(400).json({ message: 'Users who signed up with Google cannot change password.' });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect old password.' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};