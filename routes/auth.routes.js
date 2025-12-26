const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');

// Controllers aur Middleware
const { adminLogin, userLogin, changePassword } = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');

// --- IMPORTANT: User model ko yahan import karna zaroori hai ---
const User = require('../models/user.model'); 
const AdminUser = require('../models/adminUser.model');
// ---------------------------------------------------------------

// --- Aapke puraane routes waise hi rahenge ---
router.post('/admin/login', adminLogin);
router.post('/user/login', userLogin);
router.post('/change-password', auth, changePassword);
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'], 
  session: false,
  accessType: 'offline',
  prompt: 'consent'
}));

router.get('/google/callback', 
    (req, res, next) => {
        passport.authenticate('google', { 
            session: false 
        }, (err, user, info) => {
            const loginUrl = process.env.NODE_ENV === 'production' 
                ? 'https://baby2world.com/user/login' 
                : 'http://localhost:3000/user/login';
            
            // Handle authentication errors
            if (err) {
                // Check if error is about deactivated account
                if (err.message && err.message.includes('deactivated')) {
                    return res.redirect(`${loginUrl}?error=account_deactivated&message=${encodeURIComponent('Your account has been deactivated. Please contact administrator.')}`);
                }
                // Other errors
                return res.redirect(`${loginUrl}?error=login_failed&message=${encodeURIComponent(err.message || 'Login failed. Please try again.')}`);
            }
            
            if (!user) {
                return res.redirect(`${loginUrl}?error=login_failed&message=${encodeURIComponent('Authentication failed. Please try again.')}`);
            }
            
            // Check if user is active before allowing login
            if (user.isActive === false) {
                return res.redirect(`${loginUrl}?error=account_deactivated&message=${encodeURIComponent('Your account has been deactivated. Please contact administrator.')}`);
            }
            
            // Success - generate token and redirect
            const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
            const successUrl = process.env.NODE_ENV === 'production' 
                ? 'https://baby2world.com/login/success'
                : 'http://localhost:3000/login/success';
            res.redirect(`${successUrl}?token=${token}`);
        })(req, res, next);
    }
);

// --- YEH AAPKA NAYA, THEEK KIYA HUA ROUTE HAI ---
router.get('/me', auth, async (req, res) => {
  try {
    const { id, role } = req.user || {};
    if (!id) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    let entity = null;
    if (role === 'admin') {
      entity = await AdminUser.findById(id);
    } else {
      entity = await User.findById(id);
    }

    if (!entity) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // sanitize
    const safe = {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      role: role || entity.role,
      picture: entity.picture,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };

    // Add isActive field for regular users (not admins)
    if (role === 'user' && entity.isActive !== undefined) {
      safe.isActive = entity.isActive;
    }

    res.json({ success: true, user: safe });

  } catch (error) {
    // Agar server par koi bhi error aaye, to use console mein print karo
    console.error('!!! SERVER ERROR in /me route:', error); 
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});
// ----------------------------------------------------

module.exports = router;