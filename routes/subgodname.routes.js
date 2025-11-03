const express = require('express');
const router = express.Router();
const subGodNameController = require('../controllers/subgodname.controller');
const auth = require('../middleware/auth.middleware');

// Public routes
router.get('/', subGodNameController.getAllSubGodNames);
router.get('/:id', subGodNameController.getSubGodNameById);

// Protected routes (require authentication)
router.post('/', auth, subGodNameController.createSubGodName);
router.put('/:id', auth, subGodNameController.updateSubGodName);
router.delete('/:id', auth, subGodNameController.deleteSubGodName);

module.exports = router;

