const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
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
router.post('/', verifyToken, createReligion);
router.put('/:id', verifyToken, updateReligion);
router.delete('/:id', verifyToken, deleteReligion);

module.exports = router;