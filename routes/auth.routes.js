const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');

const { adminLogin, userLogin, changePassword } = require('../controllers/auth.controller');
const verifyToken = require('../middleware/verifyToken');

// --- Email & Password Routes (Public) ---
router.post('/admin/login', adminLogin);
router.post('/user/login', userLogin);

// --- Change Password Route (Private/Protected) ---
router.post('/change-password', verifyToken, changePassword);

// --- Google OAuth Routes (Public) ---
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: 'http://localhost:3000/login', session: false }),
    (req, res) => {
        const payload = { id: req.user._id, email: req.user.email, role: req.user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.redirect(`http://localhost:3000/login/success?token=${token}`);
    }
);

module.exports = router;