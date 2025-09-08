const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
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
router.post('/', verifyToken, createNickname);
router.put('/:id', verifyToken, updateNickname);
router.delete('/:id', verifyToken, deleteNickname);

module.exports = router;