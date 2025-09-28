const Name = require('../models/name.model');
const Religion = require('../models/religion.model');

// Get all names with filters and pagination
exports.getAllNames = async (req, res) => {
  try {
    // Get filters and pagination options from frontend
    const { gender, letter, religionId, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;

    // Build the filter query for PostgreSQL
    let filterQuery = {};
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    // Gender filter
    if (gender) {
      filterQuery.gender = gender.toLowerCase();
    }
    
    // Religion filter: accept either UUID or name (case-insensitive)
    if (religionId) {
      if (uuidRegex.test(religionId)) {
        filterQuery.religionId = religionId;
      } else {
        // Try resolving by religion name → id
        try {
          const religion = await Religion.findOne({ name: { $regex: `%${religionId}%` }, isActive: true });
          if (religion) {
            filterQuery.religionId = religion.id;
          } else {
            // If no religion found by name, avoid setting an invalid UUID filter
            filterQuery.religionId = undefined;
          }
        } catch (_) {
          // Ignore lookup errors; proceed without religion filter
        }
      }
    }

    if (search) {
      filterQuery.name = { $regex: `%${search}%` };
    } else if (letter) {
      filterQuery.name = { $regex: `${letter}%` };
    }
    
    // Fetch data from database
    const totalNames = await Name.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalNames / limit);
    const names = await Name.find(filterQuery, {
      page: page,
      limit: limit,
      sort: { name: 1 }
    });
    
    // Send the final response to frontend
    res.json({
      success: true,
      data: names,
      totalPages: totalPages,
      currentPage: page,
      totalNames: totalNames,
    });

  } catch (error) {
    console.error('Error fetching names:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching names'
    });
  }
};

// Get single name by ID
exports.getNameById = async (req, res) => {
  try {
    const name = await Name.findById(req.params.id);
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
};

// Create new name
exports.createName = async (req, res) => {
  try {
    const { name, description, religionId, gender } = req.body;
    
    // Check if name already exists (case-insensitive check)
    const existingName = await Name.findOne({ name: { $regex: `%${name}%` } });
    if (existingName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name already exists' 
      });
    }
    
    const newName = await Name.create({ 
      name, 
      description, 
      religionId, 
      gender 
    });
    
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
};

// Update name
exports.updateName = async (req, res) => {
  try {
    const { name, description, religionId, gender } = req.body;
    
    const updatedName = await Name.findByIdAndUpdate(
      req.params.id,
      { name, description, religionId, gender },
      { new: true }
    );
    
    if (!updatedName) {
      return res.status(404).json({ 
        success: false, 
        error: 'Name not found' 
      });
    }
    
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
};

// Delete name
exports.deleteName = async (req, res) => {
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
};
