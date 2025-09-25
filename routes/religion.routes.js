const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const {
  getAllReligions,
  getReligionById,
  createReligion,
  updateReligion,
  deleteReligion
} = require('../controllers/religion.controller');

// Public routes (koi bhi dekh sakta hai)
router.get('/', getAllReligions);
router.get('/:id', getReligionById);

// Protected routes (sirf logged in admin)
router.post('/', auth, createReligion);
router.put('/:id', auth, updateReligion);
router.delete('/:id', auth, deleteReligion);

module.exports = router;