const SubGodName = require('../models/subGodName.model');

// Get all sub god names with pagination and search
exports.getAllSubGodNames = async (req, res) => {
  try {
    const { godNameId, search, page = 1, limit = 15, sortBy = 'name' } = req.query;
    
    // Build filter query
    const filterQuery = {};
    
    if (godNameId) {
      filterQuery.godNameId = parseInt(godNameId);
    }

    // Search functionality (searches both name and description)
    if (search && search.trim()) {
      filterQuery.search = search.trim();
    }

    // Pagination options
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 15)); // Max 100 per page

    // Sort options
    let sort = { name: 1 }; // Default: ascending by name
    if (sortBy === 'nameDesc') {
      sort = { name: -1 };
    } else if (sortBy === 'newest') {
      sort = { createdAt: -1 };
    } else if (sortBy === 'oldest') {
      sort = { createdAt: 1 };
    }

    // Get total count for pagination
    const totalCount = await SubGodName.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalCount / limitNum);

    // Fetch paginated data
    const subGodNames = await SubGodName.find(filterQuery, { 
      page: pageNum, 
      limit: limitNum, 
      sort 
    });
    
    res.json({
      success: true,
      data: subGodNames,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalItems: totalCount,
        itemsPerPage: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching sub god names:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get single sub god name by ID
exports.getSubGodNameById = async (req, res) => {
  try {
    const subGodName = await SubGodName.findById(req.params.id);
    
    if (!subGodName) {
      return res.status(404).json({
        success: false,
        error: 'Sub god name not found'
      });
    }
    
    res.json({
      success: true,
      data: subGodName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create new sub god name
exports.createSubGodName = async (req, res) => {
  try {
    const { name, description, godNameId } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    if (!godNameId) {
      return res.status(400).json({
        success: false,
        error: 'God name ID is required'
      });
    }

    // Check if sub god name already exists for this god name (case-insensitive, exact match)
    const existingSubGodName = await SubGodName.findOne({
      name: name.trim(),
      godNameId: parseInt(godNameId),
      exact: true
    });
    
    if (existingSubGodName) {
      return res.status(400).json({
        success: false,
        error: 'Sub god name already exists for this god name'
      });
    }
    
    // Note: createdBy set to null for admins (admin_users table separate from users)
    const savedSubGodName = await SubGodName.create({
      name: name.trim(),
      description: description || null,
      godNameId: parseInt(godNameId),
      createdBy: null // Admins are in admin_users, not users table
    });
    
    res.status(201).json({
      success: true,
      message: 'Sub god name created successfully',
      data: savedSubGodName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update sub god name
exports.updateSubGodName = async (req, res) => {
  try {
    const { name, description, godNameId } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    // Check if another sub god name with same name exists for this god name (exact match)
    const existingSubGodName = await SubGodName.findOne({
      name: name.trim(),
      godNameId: parseInt(godNameId || req.body.godNameId),
      exact: true
    });
    
    if (existingSubGodName && existingSubGodName.id !== parseInt(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Sub god name already exists for this god name'
      });
    }
    
    const updateData = {
      name: name.trim(),
      description: description || null,
      updatedBy: null // Admins are in admin_users, not users table
    };

    if (godNameId) {
      updateData.godNameId = parseInt(godNameId);
    }

    const updatedSubGodName = await SubGodName.findByIdAndUpdate(
      req.params.id,
      updateData
    );
    
    if (!updatedSubGodName) {
      return res.status(404).json({
        success: false,
        error: 'Sub god name not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Sub god name updated successfully',
      data: updatedSubGodName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete sub god name
exports.deleteSubGodName = async (req, res) => {
  try {
    const deletedSubGodName = await SubGodName.findByIdAndDelete(req.params.id);
    
    if (!deletedSubGodName) {
      return res.status(404).json({
        success: false,
        error: 'Sub god name not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Sub god name deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

