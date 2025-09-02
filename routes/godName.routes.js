const express = require('express');
const router = express.Router();
const godNameController = require('../controllers/godName.controller');
const auth = require('../middleware/auth.middleware');

// Public routes
router.get('/', godNameController.getAllGodNames);
router.get('/:id', godNameController.getGodNameById);

// Protected routes (require authentication)
router.post('/', auth, godNameController.createGodName);
router.put('/:id', auth, godNameController.updateGodName);
router.delete('/:id', auth, godNameController.deleteGodName);
router.post('/:id/subnames', auth, godNameController.addSubName);
router.delete('/:id/subnames', auth, godNameController.removeSubName);

module.exports = router;