const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const {
  getPageBySlug,
  getAllPages,
  getPageById,
  createPage,
  updatePage,
  deletePage
} = require('../controllers/page.controller');

// Public route - anyone can view active page by slug
router.get('/slug/:slug', getPageBySlug);

// Admin routes - require authentication
router.get('/', auth, getAllPages);
router.get('/:id', auth, getPageById);
router.post('/', auth, createPage);
router.put('/:id', auth, updatePage);
router.delete('/:id', auth, deletePage);

module.exports = router;

