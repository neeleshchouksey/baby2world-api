const Religion = require('../models/religion.model');
const User = require('../models/user.model');

// Get all religions
const getAllReligions = async (req, res) => {
  try {
    const religions = await Religion.find({ isActive: true }, { sort: { name: 1 } });

    res.json({
      success: true,
      count: religions.length,
      data: religions
    });
  } catch (error) {
    console.error('Error fetching religions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch religions' 
    });
  }
};

// Get single religion by ID
const getReligionById = async (req, res) => {
  try {
    const religion = await Religion.findById(req.params.id);
    
    if (!religion || !religion.isActive) {
      return res.status(404).json({ 
        success: false, 
        error: 'Religion not found' 
      });
    }
    
    res.json({
      success: true,
      data: religion
    });
  } catch (error) {
    console.error('Error fetching religion:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch religion' 
    });
  }
};

// Create new religion (admin only)
const createReligion = async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only admins can create religions' 
      });
    }

    const { name } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Religion name is required' 
      });
    }

    // Check if religion already exists (case insensitive)
    const existingReligion = await Religion.findOne({ 
      name: { $regex: name.trim() }
    });

    if (existingReligion) {
      if (existingReligion.isActive) {
        return res.status(400).json({ 
          success: false, 
          error: 'Religion already exists' 
        });
      } else {
        // Reactivate if it was soft deleted
        existingReligion.isActive = true;
        existingReligion.updatedBy = req.user.id;
        await existingReligion.save();
        
        await existingReligion.populate('createdBy', 'name email');
        await existingReligion.populate('updatedBy', 'name email');
        
        return res.status(200).json({
          success: true,
          message: 'Religion reactivated successfully',
          data: existingReligion
        });
      }
    }

    // Create new religion
    const newReligion = await Religion.create({
      name: name.trim(),
      createdBy: req.user.id
    });
    
    // Populate creator info before sending response
    await newReligion.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Religion created successfully',
      data: newReligion
    });
  } catch (error) {
    console.error('Error creating religion:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create religion' 
    });
  }
};

// Update religion (admin only)
const updateReligion = async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only admins can update religions' 
      });
    }

    const { name } = req.body;
    const religionId = req.params.id;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Religion name is required' 
      });
    }

    // Check if religion exists
    const religion = await Religion.findById(religionId);
    if (!religion || !religion.isActive) {
      return res.status(404).json({ 
        success: false, 
        error: 'Religion not found' 
      });
    }

    // Check if new name conflicts with another religion
    const possibleDuplicates = await Religion.find({
      isActive: true,
      name: { $regex: name.trim() }
    });

    const duplicateReligion = possibleDuplicates.find(r => String(r.id) !== String(religionId));

    if (duplicateReligion) {
      return res.status(400).json({ 
        success: false, 
        error: 'Another religion with this name already exists' 
      });
    }

    // Update religion
    religion.name = name.trim();
    religion.updatedBy = req.user.id;
    await religion.save();

    // Populate updater info
    await religion.populate('createdBy', 'name email');
    await religion.populate('updatedBy', 'name email');

    res.json({
      success: true,
      message: 'Religion updated successfully',
      data: religion
    });
  } catch (error) {
    console.error('Error updating religion:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update religion' 
    });
  }
};

// Delete religion (soft delete - admin only)
const deleteReligion = async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only admins can delete religions' 
      });
    }

    const religionId = req.params.id;

    const religion = await Religion.findById(religionId);
    if (!religion || !religion.isActive) {
      return res.status(404).json({ 
        success: false, 
        error: 'Religion not found' 
      });
    }

    // Soft delete - just mark as inactive
    religion.isActive = false;
    religion.updatedBy = req.user.id;
    await religion.save();

    res.json({
      success: true,
      message: 'Religion deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting religion:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete religion' 
    });
  }
};

module.exports = {
  getAllReligions,
  getReligionById,
  createReligion,
  updateReligion,
  deleteReligion
};