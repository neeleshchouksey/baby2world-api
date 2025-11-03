const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const {
  getActiveTerms,
  getAllTerms,
  getTermsById,
  createTerms,
  updateTerms,
  deleteTerms
} = require('../controllers/termsAndConditions.controller');

// Public route - anyone can view active terms
router.get('/active', getActiveTerms);

// Admin routes - require authentication
router.get('/', auth, getAllTerms);
router.get('/:id', auth, getTermsById);
router.post('/', auth, createTerms);
router.put('/:id', auth, updateTerms);
router.delete('/:id', auth, deleteTerms);

module.exports = router;

