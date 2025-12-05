const { query } = require('../config/database');

class Name {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.religionId = data.religionId || data.religion_id;
    this.gender = data.gender;
    this.createdAt = data.createdAt || data.created_at;
    this.updatedAt = data.updatedAt || data.updated_at;
    // For populated data
    this.religion = data.religion;
  }

  // Static method to create a new name
  static async create(nameData) {
    const { name, description = '', religionId, gender } = nameData;
    
    const result = await query(
      `INSERT INTO names (name, description, "religionId", gender) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, description, religionId, gender]
    );

    return new Name(result.rows[0]);
  }

  // Static method to find name by ID
  static async findById(id) {
    const result = await query(`
      SELECT n.*, r.name as religion_name 
      FROM names n
      LEFT JOIN religions r ON n."religionId" = r.id
      WHERE n.id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const name = new Name(result.rows[0]);
    // Set religion as string instead of object for consistency
    name.religion = result.rows[0].religion_name || null;
    return name;
  }

  // Static method to find names with filters and pagination
  static async find(filterQuery = {}, options = {}) {
    const { page = 1, limit = 15, sort = { name: 1 } } = options;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramCount = 1;

    // Build WHERE clause based on filterQuery
    if (filterQuery.gender) {
      // Include unisex names when filtering by male or female
      if (filterQuery.gender === 'male' || filterQuery.gender === 'female') {
        whereClause += ` AND (LOWER(n.gender) = LOWER($${paramCount}) OR LOWER(n.gender) = 'unisex')`;
        values.push(filterQuery.gender);
        paramCount++;
      } else {
        whereClause += ` AND LOWER(n.gender) = LOWER($${paramCount})`;
        values.push(filterQuery.gender);
        paramCount++;
      }
    }

    if (filterQuery.religionId) {
      whereClause += ` AND n."religionId" = $${paramCount}`;
      values.push(filterQuery.religionId);
      paramCount++;
    }

    if (filterQuery.name) {
      if (filterQuery.name.$regex) {
        whereClause += ` AND n.name ILIKE $${paramCount}`;
        values.push(filterQuery.name.$regex);
        paramCount++;
      }
    }

    // Build ORDER BY clause
    let orderBy = 'ORDER BY n.name ASC';
    if (sort.name === -1) {
      orderBy = 'ORDER BY n.name DESC';
    }

    const queryText = `
      SELECT n.*, r.name as religion_name 
      FROM names n
      LEFT JOIN religions r ON n."religionId" = r.id
      ${whereClause}
      ${orderBy}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    values.push(limit, offset);

    const result = await query(queryText, values);
    
    return result.rows.map(row => {
      const name = new Name(row);
      name.religion = { name: row.religion_name };
      return name;
    });
  }

  // Static method to count documents
  static async countDocuments(filterQuery = {}) {
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filterQuery.gender) {
      // Include unisex names when filtering by male or female
      if (filterQuery.gender === 'male' || filterQuery.gender === 'female') {
        whereClause += ` AND (LOWER(gender) = LOWER($${paramCount}) OR LOWER(gender) = 'unisex')`;
        values.push(filterQuery.gender);
        paramCount++;
      } else {
        whereClause += ` AND LOWER(gender) = LOWER($${paramCount})`;
        values.push(filterQuery.gender);
        paramCount++;
      }
    }

    if (filterQuery.religionId) {
      whereClause += ` AND "religionId" = $${paramCount}`;
      values.push(filterQuery.religionId);
      paramCount++;
    }

    if (filterQuery.name) {
      if (filterQuery.name.$regex) {
        whereClause += ` AND name ILIKE $${paramCount}`;
        values.push(filterQuery.name.$regex);
        paramCount++;
      }
    }

    const result = await query(`SELECT COUNT(*) FROM names ${whereClause}`, values);
    return parseInt(result.rows[0].count);
  }

  // Static method to find one name
  static async findOne(conditions) {
    if (conditions.name) {
      let whereClause = 'WHERE 1=1';
      const values = [];
      let paramCount = 1;

      if (conditions.name.$regex) {
        // Handle both partial match (%pattern%) and exact match (^pattern$)
        const pattern = conditions.name.$regex;
        // Remove % and ^$ if present for ILIKE
        const cleanPattern = pattern.replace(/^%|%$/g, '').replace(/^\^|\$$/g, '');
        if (pattern.startsWith('^') && pattern.endsWith('$')) {
          // Exact match case-insensitive
          whereClause += ` AND LOWER(name) = LOWER($${paramCount})`;
        } else {
          // Partial match
          whereClause += ` AND name ILIKE $${paramCount}`;
        }
        values.push(cleanPattern);
        paramCount++;
      }

      const result = await query(`SELECT * FROM names ${whereClause} LIMIT 1`, values);
      return result.rows.length > 0 ? new Name(result.rows[0]) : null;
    }
    return null;
  }

  // Static method to find and update
  static async findByIdAndUpdate(id, updateData, options = {}) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (key === 'religionId') {
        fields.push(`"religionId" = $${paramCount}`);
      } else {
        fields.push(`"${key}" = $${paramCount}`);
      }
      values.push(value);
      paramCount++;
    }

    values.push(id);
    const updateQuery = `UPDATE names SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    return new Name(result.rows[0]);
  }

  // Static method to find and delete
  static async findByIdAndDelete(id) {
    const result = await query('DELETE FROM names WHERE id = $1 RETURNING *', [id]);
    return result.rows.length > 0 ? new Name(result.rows[0]) : null;
  }

  // Instance method to populate religion
  async populate(field) {
    if (field === 'religionId' && this.religionId) {
      const result = await query('SELECT name FROM religions WHERE id = $1', [this.religionId]);
      if (result.rows.length > 0) {
        this.religion = { name: result.rows[0].name };
      }
    }
    return this;
  }
}

module.exports = Name;