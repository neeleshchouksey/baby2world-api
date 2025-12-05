const TermsAndConditions = require('../models/termsAndConditions.model');

/**
 * Get active Terms and Conditions (Public - no auth required)
 * Ye frontend login page par show hoga
 */
const getActiveTerms = async (req, res) => {
  try {
    const activeTerms = await TermsAndConditions.findOneActive();
    
    if (!activeTerms) {
      return res.status(404).json({
        success: false,
        error: 'No active terms and conditions found'
      });
    }
    
    res.json({
      success: true,
      data: activeTerms
    });
  } catch (error) {
    console.error('Error fetching active terms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch terms and conditions'
    });
  }
};

/**
 * Get all Terms and Conditions with pagination (Admin only)
 * Ye admin panel me list ke liye use hoga
 */
const getAllTerms = async (req, res) => {
  try {
    // Check if admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can view all terms and conditions'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const search = req.query.search || '';
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    const filterQuery = {};
    if (search) filterQuery.search = search;
    if (isActive !== undefined) filterQuery.isActive = isActive;

    const sort = { createdAt: -1 }; // Latest first

    const terms = await TermsAndConditions.find(filterQuery, { page, limit, sort });
    const total = await TermsAndConditions.countDocuments(filterQuery);

    res.json({
      success: true,
      data: terms,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching all terms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch terms and conditions'
    });
  }
};

/**
 * Get single Terms and Conditions by ID (Admin only)
 */
const getTermsById = async (req, res) => {
  try {
    // Check if admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can view terms and conditions details'
      });
    }

    const terms = await TermsAndConditions.findById(req.params.id);
    
    if (!terms) {
      return res.status(404).json({
        success: false,
        error: 'Terms and conditions not found'
      });
    }
    
    res.json({
      success: true,
      data: terms
    });
  } catch (error) {
    console.error('Error fetching terms by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch terms and conditions'
    });
  }
};

/**
 * Create new Terms and Conditions (Admin only)
 */
const createTerms = async (req, res) => {
  try {
    // Check if admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can create terms and conditions'
      });
    }

    const { version, content, isActive } = req.body;

    // Validation
    if (!version || version.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Version is required'
      });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    // Create new terms and conditions
    // Note: createdBy set to null for admins (admin_users table separate from users)
    const newTerms = await TermsAndConditions.create({
      version: version.trim(),
      content: content.trim(),
      createdBy: null // Admins are in admin_users, not users table
    });

    // If isActive is true, activate this version (this will deactivate others)
    if (isActive === true) {
      await TermsAndConditions.findByIdAndUpdate(newTerms.id, { is_active: true });
      // Fetch updated version
      const updatedTerms = await TermsAndConditions.findById(newTerms.id);
      return res.status(201).json({
        success: true,
        message: 'Terms and conditions created and activated successfully',
        data: updatedTerms
      });
    }

    res.status(201).json({
      success: true,
      message: 'Terms and conditions created successfully',
      data: newTerms
    });
  } catch (error) {
    console.error('Error creating terms:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create terms and conditions'
    });
  }
};

/**
 * Update Terms and Conditions (Admin only)
 */
const updateTerms = async (req, res) => {
  try {
    // Check if admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can update terms and conditions'
      });
    }

    const { version, content, isActive } = req.body;
    const termsId = req.params.id;

    // Check if terms exists
    const existingTerms = await TermsAndConditions.findById(termsId);
    if (!existingTerms) {
      return res.status(404).json({
        success: false,
        error: 'Terms and conditions not found'
      });
    }

    // Build update data
    const updateData = {};
    if (version !== undefined) {
      if (version.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Version cannot be empty'
        });
      }
      updateData.version = version.trim();
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
    if (isActive !== undefined) {
      updateData.isActive = isActive === true;
    }

    // Update terms
    const updatedTerms = await TermsAndConditions.findByIdAndUpdate(termsId, updateData);

    res.json({
      success: true,
      message: 'Terms and conditions updated successfully',
      data: updatedTerms
    });
  } catch (error) {
    console.error('Error updating terms:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update terms and conditions'
    });
  }
};

/**
 * Delete Terms and Conditions (Admin only)
 */
const deleteTerms = async (req, res) => {
  try {
    // Check if admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can delete terms and conditions'
      });
    }

    const termsId = req.params.id;

    const terms = await TermsAndConditions.findById(termsId);
    if (!terms) {
      return res.status(404).json({
        success: false,
        error: 'Terms and conditions not found'
      });
    }

    // Don't allow deleting active terms
    if (terms.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete active terms and conditions. Please deactivate it first.'
      });
    }

    await TermsAndConditions.findByIdAndDelete(termsId);

    res.json({
      success: true,
      message: 'Terms and conditions deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting terms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete terms and conditions'
    });
  }
};

module.exports = {
  getActiveTerms,
  getAllTerms,
  getTermsById,
  createTerms,
  updateTerms,
  deleteTerms
};

