const express = require('express');
const router = express.Router();
const Name = require('../models/name.model');
const authMiddleware = require('../middleware/auth.middleware');

// Get all names (public route)
router.get('/', async (req, res) => {
  try {
    const names = await Name.find()
      .populate('religionId', 'name')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: names
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching names'
    });
  }
});

// Get single name by ID
router.get('/:id', async (req, res) => {
  try {
    const name = await Name.findById(req.params.id)
      .populate('religionId', 'name');
    
    if (!name) {
      return res.status(404).json({
        success: false,
        error: 'Name not found'
      });
    }
    
    res.json({
      success: true,
      data: name
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching name'
    });
  }
});

// Create new name (protected route)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, religionId, gender } = req.body;
    
    // Check if name already exists
    const existingName = await Name.findOne({ name });
    if (existingName) {
      return res.status(400).json({
        success: false,
        error: 'Name already exists'
      });
    }
    
    // Create new name
    const newName = await Name.create({
      name,
      description,
      religionId,
      gender
    });
    
    // Populate religion info before sending response
    await newName.populate('religionId', 'name');
    
    res.status(201).json({
      success: true,
      message: 'Name added successfully',
      data: newName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error creating name'
    });
  }
});

// Update name (protected route)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, religionId, gender } = req.body;
    
    // Check if name exists
    const nameDoc = await Name.findById(req.params.id);
    if (!nameDoc) {
      return res.status(404).json({
        success: false,
        error: 'Name not found'
      });
    }
    
    // Check if new name already exists (excluding current)
    if (name && name !== nameDoc.name) {
      const existingName = await Name.findOne({ name });
      if (existingName) {
        return res.status(400).json({
          success: false,
          error: 'Name already exists'
        });
      }
    }
    
    // Update name
    const updatedName = await Name.findByIdAndUpdate(
      req.params.id,
      { name, description, religionId, gender },
      { new: true, runValidators: true }
    ).populate('religionId', 'name');
    
    res.json({
      success: true,
      message: 'Name updated successfully',
      data: updatedName
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Error updating name'
    });
  }
});

// Delete name (protected route)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const name = await Name.findByIdAndDelete(req.params.id);
    
    if (!name) {
      return res.status(404).json({
        success: false,
        error: 'Name not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Name deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error deleting name'
    });
  }
});

// Get names by religion
router.get('/by-religion/:religionId', async (req, res) => {
  try {
    const names = await Name.find({ religionId: req.params.religionId })
      .populate('religionId', 'name')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: names
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching names by religion'
    });
  }
});

// Get names by gender
router.get('/by-gender/:gender', async (req, res) => {
  try {
    const names = await Name.find({ gender: req.params.gender.toLowerCase() })
      .populate('religionId', 'name')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: names
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching names by gender'
    });
  }
});
// Get names by first letter
router.get('/by-letter/:letter', async (req, res) => {
  try {
    const { letter } = req.params;
    console.log('API called for letter:', letter); // Debug log add karo
    
    // Find names starting with the letter (case insensitive)  
    const names = await Name.find({
      name: { $regex: `^${letter}`, $options: 'i' }
    })
    .populate('religionId', 'name')
    .sort({ name: 1 });
    
    console.log('Found names:', names); // Debug log
    
    res.json({
      success: true,
      data: names,
      count: names.length,
      letter: letter.toUpperCase()
    });
  } catch (error) {
    console.error('Error fetching names by letter:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching names'
    });
  }
});

module.exports = router;