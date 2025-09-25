const Nickname = require('../models/nickname.model');
const User = require('../models/user.model');

// Get all nicknames
const getAllNicknames = async (req, res) => {
  try {
    const { search } = req.query;
    const filterQuery = { isActive: true };
    
    // Search functionality
    if (search) {
      filterQuery.name = { $regex: `%${search}%` };
    }
    
    const nicknames = await Nickname.find(filterQuery, { sort: { name: 1 } });
    
    res.json({
      success: true,
      count: nicknames.length,
      data: nicknames
    });
  } catch (error) {
    console.error('Error fetching nicknames:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch nicknames' 
    });
  }
};

// Get single nickname by ID
const getNicknameById = async (req, res) => {
  try {
    const nickname = await Nickname.findById(req.params.id);
    
    if (!nickname || !nickname.isActive) {
      return res.status(404).json({ 
        success: false, 
        error: 'Nickname not found' 
      });
    }
    
    res.json({
      success: true,
      data: nickname
    });
  } catch (error) {
    console.error('Error fetching nickname:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch nickname' 
    });
  }
};

// Create new nickname (admin only)
const createNickname = async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only admins can create nicknames' 
      });
    }

    const { name, description } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Nickname is required' 
      });
    }

    // Check if nickname already exists (case insensitive)
    const existingNickname = await Nickname.findOne({ 
      name: { $regex: name.trim() }
    });

    if (existingNickname) {
      if (existingNickname.isActive) {
        return res.status(400).json({ 
          success: false, 
          error: 'Nickname already exists' 
        });
      } else {
        // Reactivate if it was soft deleted
        existingNickname.isActive = true;
        existingNickname.description = description || existingNickname.description;
        existingNickname.updatedBy = req.user.id;
        await existingNickname.save();
        
        await existingNickname.populate('createdBy', 'name email');
        await existingNickname.populate('updatedBy', 'name email');
        
        return res.status(200).json({
          success: true,
          message: 'Nickname reactivated successfully',
          data: existingNickname
        });
      }
    }

    // Create new nickname
    const newNickname = await Nickname.create({
      name: name.trim(),
      description: description || '',
      createdBy: req.user.id
    });
    
    // Populate creator info before sending response
    await newNickname.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Nickname created successfully',
      data: newNickname
    });
  } catch (error) {
    console.error('Error creating nickname:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create nickname' 
    });
  }
};

// Update nickname (admin only)
const updateNickname = async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only admins can update nicknames' 
      });
    }

    const { name, description } = req.body;
    const nicknameId = req.params.id;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Nickname is required' 
      });
    }

    // Check if nickname exists
    const nickname = await Nickname.findById(nicknameId);
    if (!nickname || !nickname.isActive) {
      return res.status(404).json({ 
        success: false, 
        error: 'Nickname not found' 
      });
    }

    // Check if new name conflicts with another nickname
    const possibleDuplicates = await Nickname.find({
      isActive: true,
      name: { $regex: name.trim() }
    });

    const duplicateNickname = possibleDuplicates.find(n => String(n.id) !== String(nicknameId));

    if (duplicateNickname) {
      return res.status(400).json({ 
        success: false, 
        error: 'Another nickname with this name already exists' 
      });
    }

    // Update nickname
    nickname.name = name.trim();
    nickname.description = description || '';
    nickname.updatedBy = req.user.id;
    await nickname.save();

    // Populate updater info
    await nickname.populate('createdBy', 'name email');
    await nickname.populate('updatedBy', 'name email');

    res.json({
      success: true,
      message: 'Nickname updated successfully',
      data: nickname
    });
  } catch (error) {
    console.error('Error updating nickname:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update nickname' 
    });
  }
};

// Delete nickname (soft delete - admin only)
const deleteNickname = async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only admins can delete nicknames' 
      });
    }

    const nicknameId = req.params.id;

    const nickname = await Nickname.findById(nicknameId);
    if (!nickname || !nickname.isActive) {
      return res.status(404).json({ 
        success: false, 
        error: 'Nickname not found' 
      });
    }

    // Soft delete - just mark as inactive
    nickname.isActive = false;
    nickname.updatedBy = req.user.id;
    await nickname.save();

    res.json({
      success: true,
      message: 'Nickname deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting nickname:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete nickname' 
    });
  }
};

module.exports = {
  getAllNicknames,
  getNicknameById,
  createNickname,
  updateNickname,
  deleteNickname
};