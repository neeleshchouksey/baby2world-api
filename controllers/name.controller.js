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
    
    // Gender filter - map frontend values to database values
    if (gender) {
      if (gender.toLowerCase() === 'boy') {
        filterQuery.gender = 'male';
      } else if (gender.toLowerCase() === 'girl') {
        filterQuery.gender = 'female';
      } else {
        filterQuery.gender = gender.toLowerCase();
      }
    }
    
    // Religion filter: accept UUID, serial number, or name
    if (religionId) {
      // Check if it's a UUID format
      if (uuidRegex.test(religionId)) {
        filterQuery.religionId = religionId;
      } 
      // Check if it's a numeric ID (serial number)
      else if (!isNaN(religionId) && religionId > 0) {
        filterQuery.religionId = religionId;
      } 
      // Try resolving by religion name
      else {
        try {
          const religion = await Religion.findOne({ name: { $regex: `%${religionId}%` }, isActive: true });
          if (religion) {
            filterQuery.religionId = religion.id;
          } else {
            // If no religion found by name, avoid setting an invalid filter
            filterQuery.religionId = undefined;
          }
        } catch (error) {
          // Ignore lookup errors; proceed without religion filter
        }
      }
    }

    if (search) {
      filterQuery.search = search;
    } else if (letter) {
      filterQuery.letter = letter;
    }
    
    // Fetch data from database using PostgreSQL
    const { query } = require('../config/database');
    
    // Build WHERE clause for PostgreSQL
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (filterQuery.gender) {
      whereClause += ` AND LOWER(gender) = LOWER($${paramIndex})`;
      params.push(filterQuery.gender);
      paramIndex++;
    }
    
    if (filterQuery.religionId) {
      whereClause += ` AND religion_id = $${paramIndex}`;
      params.push(filterQuery.religionId);
      paramIndex++;
    }
    
    if (filterQuery.search) {
      whereClause += ` AND LOWER(n.name) LIKE LOWER($${paramIndex})`;
      params.push(`%${filterQuery.search}%`);
      paramIndex++;
    } else if (filterQuery.letter) {
      whereClause += ` AND LOWER(n.name) LIKE LOWER($${paramIndex})`;
      params.push(`${filterQuery.letter}%`);
      paramIndex++;
    }
    
    // Get total count
    const countResult = await query(`SELECT COUNT(*) as total FROM names n ${whereClause}`, params);
    const totalNames = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalNames / limit);
    
    // Get names with pagination
    const offset = (page - 1) * limit;
    const namesQuery = `
      SELECT n.*, r.name as religion_name 
      FROM names n 
      LEFT JOIN religions r ON n.religion_id = r.id 
      ${whereClause} 
      ORDER BY n.name ASC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);
    
    const namesResult = await query(namesQuery, params);
    const names = namesResult.rows.map(row => new Name({
      id: row.id,
      name: row.name,
      description: row.description,
      religion_id: row.religion_id,
      gender: row.gender,
      created_at: row.created_at,
      updated_at: row.updated_at,
      religion: row.religion_name
    }));
    
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

// Delete all names
exports.deleteAllNames = async (req, res) => {
  try {
    console.log('Delete all names request received');
    const { query } = require('../config/database');
    
    // Delete all names from database
    console.log('Executing DELETE FROM names query...');
    const result = await query('DELETE FROM names');
    console.log('Delete query result:', result);
    
    res.json({
      success: true,
      message: 'All names deleted successfully',
      deletedCount: result.rowCount
    });
  } catch (error) {
    console.error('Error deleting all names:', error);
    res.status(500).json({
      success: false,
      error: `Error deleting all names: ${error.message}`
    });
  }
};
