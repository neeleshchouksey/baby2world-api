const express = require('express');
const router = express.Router();
const nameController = require('../controllers/name.controller');
const auth = require('../middleware/auth.middleware');

// Public routes
router.get('/', nameController.getAllNames);
router.get('/:id', nameController.getNameById);

// Protected routes (require authentication)
router.post('/', auth, nameController.createName);
router.put('/:id', auth, nameController.updateName);
router.delete('/all', auth, nameController.deleteAllNames); // Changed to /all to avoid conflict
router.delete('/:id', auth, nameController.deleteName);

module.exports = router;