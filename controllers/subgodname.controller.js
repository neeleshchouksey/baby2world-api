const SubGodName = require('../models/subGodName.model');
const { query } = require('../config/database');

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
    
    // Also add to god_name_sub_names table for user dashboard display
    try {
      // Check if already exists in god_name_sub_names
      const existingCheck = await query(
        'SELECT 1 FROM god_name_sub_names WHERE god_name_id = $1 AND LOWER(sub_name) = LOWER($2)',
        [parseInt(godNameId), name.trim()]
      );
      
      if (existingCheck.rows.length === 0) {
        await query(
          'INSERT INTO god_name_sub_names (god_name_id, sub_name) VALUES ($1, $2)',
          [parseInt(godNameId), name.trim()]
        );
      }
    } catch (syncError) {
      console.error('Error syncing to god_name_sub_names:', syncError);
      // Don't fail the request if sync fails, just log it
    }
    
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

    // Get the old sub god name before updating
    const oldSubGodName = await SubGodName.findById(req.params.id);
    if (!oldSubGodName) {
      return res.status(404).json({
        success: false,
        error: 'Sub god name not found'
      });
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
    
    // Sync with god_name_sub_names table
    try {
      const finalGodNameId = parseInt(godNameId || oldSubGodName.godNameId);
      const oldName = oldSubGodName.name.trim();
      const newName = name.trim();
      
      // If name changed, update in god_name_sub_names
      if (oldName.toLowerCase() !== newName.toLowerCase()) {
        // Remove old entry
        await query(
          'DELETE FROM god_name_sub_names WHERE god_name_id = $1 AND LOWER(sub_name) = LOWER($2)',
          [finalGodNameId, oldName]
        );
        
        // Add new entry (if it doesn't exist)
        const existingCheck = await query(
          'SELECT 1 FROM god_name_sub_names WHERE god_name_id = $1 AND LOWER(sub_name) = LOWER($2)',
          [finalGodNameId, newName]
        );
        
        if (existingCheck.rows.length === 0) {
          await query(
            'INSERT INTO god_name_sub_names (god_name_id, sub_name) VALUES ($1, $2)',
            [finalGodNameId, newName]
          );
        }
      } else if (godNameId && parseInt(godNameId) !== oldSubGodName.godNameId) {
        // If god name ID changed, update the entry
        await query(
          'UPDATE god_name_sub_names SET god_name_id = $1 WHERE god_name_id = $2 AND LOWER(sub_name) = LOWER($3)',
          [finalGodNameId, oldSubGodName.godNameId, newName]
        );
      }
    } catch (syncError) {
      console.error('Error syncing to god_name_sub_names on update:', syncError);
      // Don't fail the request if sync fails, just log it
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
    // Get the sub god name before deleting
    const subGodNameToDelete = await SubGodName.findById(req.params.id);
    
    if (!subGodNameToDelete) {
      return res.status(404).json({
        success: false,
        error: 'Sub god name not found'
      });
    }
    
    const deletedSubGodName = await SubGodName.findByIdAndDelete(req.params.id);
    
    // Also remove from god_name_sub_names table
    try {
      await query(
        'DELETE FROM god_name_sub_names WHERE god_name_id = $1 AND LOWER(sub_name) = LOWER($2)',
        [subGodNameToDelete.godNameId, subGodNameToDelete.name.trim()]
      );
    } catch (syncError) {
      console.error('Error syncing deletion to god_name_sub_names:', syncError);
      // Don't fail the request if sync fails, just log it
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

