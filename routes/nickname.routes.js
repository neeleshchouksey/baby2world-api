const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const {
  getAllNicknames,
  getNicknameById,
  createNickname,
  updateNickname,
  deleteNickname
} = require('../controllers/nickname.controller');

// Public routes
router.get('/', getAllNicknames);
router.get('/:id', getNicknameById);

// Protected routes (admin only)
router.post('/', auth, createNickname);
router.put('/:id', auth, updateNickname);
router.delete('/:id', auth, deleteNickname);

module.exports = router;