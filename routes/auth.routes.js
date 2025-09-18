const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');

// Controllers aur Middleware
const { adminLogin, userLogin, changePassword } = require('../controllers/auth.controller');
const verifyToken = require('../middleware/verifytoken');

// --- IMPORTANT: User model ko yahan import karna zaroori hai ---
const User = require('../models/user.model'); 
// ---------------------------------------------------------------

// --- Aapke puraane routes waise hi rahenge ---
router.post('/admin/login', adminLogin);
router.post('/user/login', userLogin);
router.post('/change-password', verifyToken, changePassword);
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: 'http://localhost:3000/user/login', session: false }),
    (req, res) => {
        const payload = { id: req.user._id, email: req.user.email, role: req.user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.redirect(`http://localhost:3000/login/success?token=${token}`);
    }
);

// --- YEH AAPKA NAYA, THEEK KIYA HUA ROUTE HAI ---
router.get('/me', verifyToken, async (req, res) => {
  try {
    // Debugging ke liye console log daalein
    console.log('Inside /me route. User ID from token:', req.user.id);

    // verifyToken middleware se req.user.id milta hai
    const user = await User.findById(req.user.id).select('-password'); // password nahi bhejenge

    if (!user) {
      console.log('User not found in database for ID:', req.user.id);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Sab theek hai to user ka data bhej do
    res.json({ success: true, user: user });

  } catch (error) {
    // Agar server par koi bhi error aaye, to use console mein print karo
    console.error('!!! SERVER ERROR in /me route:', error); 
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});
// ----------------------------------------------------

module.exports = router;