const Page = require('../models/page.model');

/**
 * Get active Page by slug (Public - no auth required)
 * Ye frontend par show hoga
 */
const getPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = await Page.findBySlug(slug);
    
    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'Page not found'
      });
    }
    
    res.json({
      success: true,
      data: page
    });
  } catch (error) {
    console.error('Error fetching page by slug:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch page'
    });
  }
};

/**
 * Get all Pages with pagination (Admin only)
 */
const getAllPages = async (req, res) => {
  try {
    // Check if admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can view pages list'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const search = req.query.search || '';
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    const filterQuery = {};
    if (search) filterQuery.search = search;
    if (isActive !== undefined) filterQuery.isActive = isActive;

    const sort = { createdAt: -1 }; // Default: newest first

    const pages = await Page.find(filterQuery, { page, limit, sort });
    const total = await Page.countDocuments(filterQuery);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: pages,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pages'
    });
  }
};

/**
 * Get single Page by ID (Admin only)
 */
const getPageById = async (req, res) => {
  try {
    // Check if admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can view page details'
      });
    }

    const page = await Page.findById(req.params.id);
    
    if (!page) {
      return res.status(404).json({
        success: false,
        error: 'Page not found'
      });
    }
    
    res.json({
      success: true,
      data: page
    });
  } catch (error) {
    console.error('Error fetching page by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch page'
    });
  }
};

/**
 * Create new Page (Admin only)
 */
const createPage = async (req, res) => {
  try {
    // Check if admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can create pages'
      });
    }

    const { title, slug, content, metaTitle, metaDescription, metaKeywords, isActive } = req.body;

    // Validation
    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    if (!slug || slug.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Slug is required'
      });
    }

    // Validate slug format (alphanumeric, hyphens, underscores only)
    const slugRegex = /^[a-z0-9-_]+$/;
    if (!slugRegex.test(slug)) {
      return res.status(400).json({
        success: false,
        error: 'Slug can only contain lowercase letters, numbers, hyphens, and underscores'
      });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    // Create new page
    const newPage = await Page.create({
      title: title.trim(),
      slug: slug.trim().toLowerCase(),
      content: content.trim(),
      metaTitle: metaTitle ? metaTitle.trim() : null,
      metaDescription: metaDescription ? metaDescription.trim() : null,
      metaKeywords: metaKeywords ? metaKeywords.trim() : null,
      createdBy: null // Admins are in admin_users, not users table
    });

    // If isActive is provided, update it
    if (isActive !== undefined) {
      await Page.findByIdAndUpdate(newPage.id, { isActive: isActive === true });
      const updatedPage = await Page.findById(newPage.id);
      return res.status(201).json({
        success: true,
        message: 'Page created successfully',
        data: updatedPage
      });
    }

    res.status(201).json({
      success: true,
      message: 'Page created successfully',
      data: newPage
    });
  } catch (error) {
    console.error('Error creating page:', error);
    
    // Handle unique constraint violation (duplicate slug)
    if (error.code === '23505' || error.message.includes('duplicate key')) {
      return res.status(400).json({
        success: false,
        error: 'A page with this slug already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create page'
    });
  }
};

/**
 * Update Page (Admin only)
 */
const updatePage = async (req, res) => {
  try {
    // Check if admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can update pages'
      });
    }

    const { title, slug, content, metaTitle, metaDescription, metaKeywords, isActive } = req.body;
    const pageId = req.params.id;

    // Check if page exists
    const existingPage = await Page.findById(pageId);
    if (!existingPage) {
      return res.status(404).json({
        success: false,
        error: 'Page not found'
      });
    }

    // Build update data
    const updateData = {};
    if (title !== undefined) {
      if (title.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Title cannot be empty'
        });
      }
      updateData.title = title.trim();
    }
    if (slug !== undefined) {
      if (slug.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Slug cannot be empty'
        });
      }
      // Validate slug format
      const slugRegex = /^[a-z0-9-_]+$/;
      if (!slugRegex.test(slug)) {
        return res.status(400).json({
          success: false,
          error: 'Slug can only contain lowercase letters, numbers, hyphens, and underscores'
        });
      }
      updateData.slug = slug.trim().toLowerCase();
    }
    if (content !== undefined) {
      if (content.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Content cannot be empty'
        });
      }
      updateData.content = content.trim();
    }
    if (metaTitle !== undefined) {
      updateData.metaTitle = metaTitle ? metaTitle.trim() : null;
    }
    if (metaDescription !== undefined) {
      updateData.metaDescription = metaDescription ? metaDescription.trim() : null;
    }
    if (metaKeywords !== undefined) {
      updateData.metaKeywords = metaKeywords ? metaKeywords.trim() : null;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive === true;
    }

    // Update page
    const updatedPage = await Page.findByIdAndUpdate(pageId, updateData);

    res.json({
      success: true,
      message: 'Page updated successfully',
      data: updatedPage
    });
  } catch (error) {
    console.error('Error updating page:', error);
    
    // Handle unique constraint violation (duplicate slug)
    if (error.code === '23505' || error.message.includes('duplicate key')) {
      return res.status(400).json({
        success: false,
        error: 'A page with this slug already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update page'
    });
  }
};

/**
 * Delete Page (Admin only)
 */
const deletePage = async (req, res) => {
  try {
    // Check if admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can delete pages'
      });
    }

    const pageId = req.params.id;

    // Check if page exists
    const existingPage = await Page.findById(pageId);
    if (!existingPage) {
      return res.status(404).json({
        success: false,
        error: 'Page not found'
      });
    }

    // Delete page
    await Page.findByIdAndDelete(pageId);

    res.json({
      success: true,
      message: 'Page deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete page'
    });
  }
};

module.exports = {
  getPageBySlug,
  getAllPages,
  getPageById,
  createPage,
  updatePage,
  deletePage
};

