const Origin = require('../models/origin.model');
const User = require('../models/user.model');

// Get all origins
const getAllOrigins = async (req, res) => {
  try {
    const origins = await Origin.find({ isActive: true }, { sort: { name: 1 } });

    res.json({
      success: true,
      count: origins.length,
      data: origins
    });
  } catch (error) {
    console.error('Error fetching origins:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch origins' 
    });
  }
};

// Get single origin by ID
const getOriginById = async (req, res) => {
  try {
    const origin = await Origin.findById(req.params.id);
    
    if (!origin || !origin.isActive) {
      return res.status(404).json({ 
        success: false, 
        error: 'Origin not found' 
      });
    }
    
    res.json({
      success: true,
      data: origin
    });
  } catch (error) {
    console.error('Error fetching origin:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch origin' 
    });
  }
};

// Create new origin (admin only)
const createOrigin = async (req, res) => {
  try {
    // Check if admin based on JWT payload (after admin split)
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only admins can create origins' 
      });
    }

    const { name } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Origin name is required' 
      });
    }

    // Check if origin already exists (case insensitive)
    const existingOrigin = await Origin.findOne({ 
      name: { $regex: name.trim() }
    });

    if (existingOrigin) {
      if (existingOrigin.isActive) {
        return res.status(400).json({ 
          success: false, 
          error: 'Origin already exists' 
        });
      } else {
        // Reactivate if it was soft deleted
        existingOrigin.isActive = true;
        existingOrigin.updatedBy = null; // Admins are in admin_users
        await existingOrigin.save();
        
        return res.status(200).json({
          success: true,
          message: 'Origin reactivated successfully',
          data: existingOrigin
        });
      }
    }

    // Create new origin
    // Note: createdBy set to null for admins (admin_users table separate from users)
    const newOrigin = await Origin.create({
      name: name.trim(),
      createdBy: null // Admins are in admin_users, not users table
    });

    res.status(201).json({
      success: true,
      message: 'Origin created successfully',
      data: newOrigin
    });
  } catch (error) {
    console.error('Error creating origin:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create origin' 
    });
  }
};

// Update origin (admin only)
const updateOrigin = async (req, res) => {
  try {
    // Check if admin based on JWT payload
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only admins can update origins' 
      });
    }

    const { name } = req.body;
    const originId = req.params.id;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Origin name is required' 
      });
    }

    // Check if origin exists
    const origin = await Origin.findById(originId);
    if (!origin || !origin.isActive) {
      return res.status(404).json({ 
        success: false, 
        error: 'Origin not found' 
      });
    }

    // Check if new name conflicts with another origin
    const possibleDuplicates = await Origin.find({
      isActive: true,
      name: { $regex: name.trim() }
    });

    const duplicateOrigin = possibleDuplicates.find(o => String(o.id) !== String(originId));

    if (duplicateOrigin) {
      return res.status(400).json({ 
        success: false, 
        error: 'Another origin with this name already exists' 
      });
    }

    // Update origin
    origin.name = name.trim();
    origin.updatedBy = null; // Admins are in admin_users
    await origin.save();

    res.json({
      success: true,
      message: 'Origin updated successfully',
      data: origin
    });
  } catch (error) {
    console.error('Error updating origin:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update origin' 
    });
  }
};

// Delete origin (soft delete - admin only)
const deleteOrigin = async (req, res) => {
  try {
    // Check if admin based on JWT payload
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only admins can delete origins' 
      });
    }

    const originId = req.params.id;

    const origin = await Origin.findById(originId);
    if (!origin || !origin.isActive) {
      return res.status(404).json({ 
        success: false, 
        error: 'Origin not found' 
      });
    }

    // Soft delete - just mark as inactive
    origin.isActive = false;
    origin.updatedBy = null; // Admins are in admin_users
    await origin.save();

    res.json({
      success: true,
      message: 'Origin deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting origin:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete origin' 
    });
  }
};

module.exports = {
  getAllOrigins,
  getOriginById,
  createOrigin,
  updateOrigin,
  deleteOrigin
};

