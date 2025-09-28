const express = require('express');
const router = express.Router();

// 1. POORA CONTROLLER OBJECT IMPORT KAREIN (YAHI SABSE IMPORTANT HAI)
const userController = require('../controllers/user.controller');

// 2. Authentication middleware import karein
const auth = require('../middleware/auth.middleware');

// Yeh ek test route hai debugging ke liye
router.get('/test', (req, res) => {
  res.send('USER ROUTE TEST OK! File is now working!');
});

// Route to get all favorite names for the logged-in user
// Ab hum har function ko 'userController.' ke saath call karenge
router.get('/favorites', auth, userController.getFavorites);

// Route to add or remove a regular favorite name
router.post('/favorites/:nameId', auth, userController.toggleFavorite);
router.get('/favorites/god-names', auth, userController.getGodNameFavorites);
// Route for God Name favorites - ab yeh bhi crash nahi hoga
router.post('/favorites/god-names/:godNameId', auth, userController.toggleGodNameFavorite);
router.get('/favorites/nicknames', auth, userController.getNicknameFavorites);
router.post('/favorites/nicknames/:nicknameId', auth, userController.toggleNicknameFavorite);

module.exports = router;