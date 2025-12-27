const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const {
  getPageBySlug,
  getActivePages,
  getAllPages,
  getPageById,
  createPage,
  updatePage,
  deletePage
} = require('../controllers/page.controller');

// Public routes - anyone can access
router.get('/slug/:slug', getPageBySlug);
router.get('/active', getActivePages);

// Admin routes - require authentication
router.get('/', auth, getAllPages);
router.get('/:id', auth, getPageById);
router.post('/', auth, createPage);
router.put('/:id', auth, updatePage);
router.delete('/:id', auth, deletePage);

module.exports = router;

