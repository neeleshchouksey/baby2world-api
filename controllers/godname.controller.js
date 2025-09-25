const GodName = require('../models/godname.model');

// Get all god names
exports.getAllGodNames = async (req, res) => {
  try {
    const godNames = await GodName.find({}, { sort: { name: 1 } });
    res.json({
      success: true,
      data: godNames
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get single god name by ID
exports.getGodNameById = async (req, res) => {
  try {
    const godName = await GodName.findById(req.params.id);
    
    if (!godName) {
      return res.status(404).json({
        success: false,
        error: 'God name not found'
      });
    }
    
    res.json({
      success: true,
      data: godName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create new god name
exports.createGodName = async (req, res) => {
  try {
    const { name, description, religionId, subNames } = req.body;
    
    // Check if god name already exists (case-insensitive per religion)
    const existingGod = await GodName.findOne({ 
      name: { $regex: `^${name}$` },
      religionId 
    });
    
    if (existingGod) {
      return res.status(400).json({
        success: false,
        error: 'God name already exists in this religion'
      });
    }
    
    const savedGodName = await GodName.create({
      name,
      description,
      religionId,
      subNames: Array.isArray(subNames) ? subNames : [],
      createdBy: req.userId || (req.user && (req.user.id || req.user.userId))
    });
    
    res.status(201).json({
      success: true,
      message: 'God name created successfully',
      data: savedGodName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update god name
exports.updateGodName = async (req, res) => {
  try {
    const { name, description, religionId, subNames } = req.body;
    
    const updatedGodName = await GodName.findByIdAndUpdate(
      req.params.id,
      { name, description, religionId, subNames }
    );
    
    if (!updatedGodName) {
      return res.status(404).json({
        success: false,
        error: 'God name not found'
      });
    }
    
    res.json({
      success: true,
      message: 'God name updated successfully',
      data: updatedGodName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete god name
exports.deleteGodName = async (req, res) => {
  try {
    const deletedGodName = await GodName.findByIdAndDelete(req.params.id);
    
    if (!deletedGodName) {
      return res.status(404).json({
        success: false,
        error: 'God name not found'
      });
    }
    
    res.json({
      success: true,
      message: 'God name deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Add sub name to existing god
exports.addSubName = async (req, res) => {
  try {
    const { subName } = req.body;
    
    const godName = await GodName.findById(req.params.id);
    
    if (!godName) {
      return res.status(404).json({
        success: false,
        error: 'God name not found'
      });
    }
    
    await godName.addSubName(subName);
    
    res.json({
      success: true,
      message: 'Sub name added successfully',
      data: godName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Remove sub name
exports.removeSubName = async (req, res) => {
  try {
    const { subName } = req.body;
    
    const godName = await GodName.findById(req.params.id);
    
    if (!godName) {
      return res.status(404).json({
        success: false,
        error: 'God name not found'
      });
    }
    
    await godName.removeSubName(subName);
    
    res.json({
      success: true,
      message: 'Sub name removed successfully',
      data: godName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};