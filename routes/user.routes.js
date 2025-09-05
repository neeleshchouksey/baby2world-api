const express = require('express');
const router = express.Router();
const { getFavorites, toggleFavorite } = require('../controllers/user.controller');
const verifyToken = require('../middleware/verifyToken');

// This is a professional way to protect all routes in this file.
// The verifyToken middleware will run for every request to /favorites.
router.use(verifyToken);

// Route to get all favorite names for the logged-in user
// Full URL will be: GET http://localhost:PORT/api/user/favorites
router.get('/favorites', getFavorites);

// Route to add or remove a favorite name
// Full URL will be: POST http://localhost:PORT/api/user/favorites/60d21b4667d0d8992e610c85
router.post('/favorites/:nameId', toggleFavorite);

module.exports = router;