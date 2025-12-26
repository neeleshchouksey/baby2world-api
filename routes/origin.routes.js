const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const {
  getAllOrigins,
  getOriginById,
  createOrigin,
  updateOrigin,
  deleteOrigin
} = require('../controllers/origin.controller');

// Public routes (koi bhi dekh sakta hai)
router.get('/', getAllOrigins);
router.get('/:id', getOriginById);

// Protected routes (sirf logged in admin)
router.post('/', auth, createOrigin);
router.put('/:id', auth, updateOrigin);
router.delete('/:id', auth, deleteOrigin);

module.exports = router;

