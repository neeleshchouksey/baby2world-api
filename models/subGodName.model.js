/**
 * SubGodName Model
 * 
 * Optimized for handling large datasets (200,000+ records)
 * Features:
 * - Pagination support (LIMIT/OFFSET) for efficient data retrieval
 * - Advanced search (name, description, general search with ILIKE)
 * - Efficient indexing (god_name_id, name indexes required)
 * - Count documents method for pagination metadata
 * 
 * Database Indexes (required for performance):
 * - idx_subgodnames_god_name_id (on god_name_id) - for filtering by god name
 * - idx_subgodnames_name (on name) - for searching and sorting by name
 */

const { query, getClient } = require('../config/database');

class SubGodName {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.godNameId = data.godNameId || data.god_name_id;
    this.createdBy = data.createdBy || data.created_by;
    this.updatedBy = data.updatedBy || data.updated_by;
    this.createdAt = data.createdAt || data.created_at;
    this.updatedAt = data.updatedAt || data.updated_at;
    // For populated data
    this.godName = data.god_name;
  }

  // Static method to create a new sub god name
  static async create(subGodNameData) {
    const { name, description, godNameId, createdBy } = subGodNameData;
    
    const result = await query(
      `INSERT INTO sub_god_names (name, description, "godNameId", "createdBy") 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, description || null, godNameId, createdBy]
    );

    return new SubGodName(result.rows[0]);
  }

  // Static method to find sub god name by ID
  static async findById(id) {
    const result = await query(`
      SELECT sg.*, gn.name as god_name 
      FROM sub_god_names sg
      LEFT JOIN god_names gn ON sg."godNameId" = gn.id
      WHERE sg.id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const subGodName = new SubGodName(result.rows[0]);
    subGodName.godName = { name: result.rows[0].god_name };

    return subGodName;
  }

  // Static method to find sub god names with filters and pagination
  static async find(filterQuery = {}, options = {}) {
    const { page = 1, limit = 15, sort = { name: 1 } } = options;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramCount = 1;

    // Filter by god name ID
    if (filterQuery.godNameId) {
      whereClause += ` AND sg."godNameId" = $${paramCount}`;
      values.push(parseInt(filterQuery.godNameId));
      paramCount++;
    }

    // Search by name (supports multiple patterns)
    if (filterQuery.name) {
      if (filterQuery.name.$regex) {
        whereClause += ` AND sg.name ILIKE $${paramCount}`;
        values.push(filterQuery.name.$regex);
        paramCount++;
      } else if (typeof filterQuery.name === 'string') {
        // Direct string search
        whereClause += ` AND sg.name ILIKE $${paramCount}`;
        values.push(`%${filterQuery.name}%`);
        paramCount++;
      }
    }

    // Search in description
    if (filterQuery.description) {
      if (filterQuery.description.$regex) {
        whereClause += ` AND sg.description ILIKE $${paramCount}`;
        values.push(filterQuery.description.$regex);
        paramCount++;
      } else if (typeof filterQuery.description === 'string') {
        whereClause += ` AND sg.description ILIKE $${paramCount}`;
        values.push(`%${filterQuery.description}%`);
        paramCount++;
      }
    }

    // General search (searches both name and description)
    if (filterQuery.search) {
      whereClause += ` AND (sg.name ILIKE $${paramCount} OR sg.description ILIKE $${paramCount})`;
      values.push(`%${filterQuery.search}%`);
      values.push(`%${filterQuery.search}%`);
      paramCount += 2;
    }

    // Build ORDER BY clause
    let orderBy = 'ORDER BY sg.name ASC';
    if (sort.name === -1) {
      orderBy = 'ORDER BY sg.name DESC';
    } else if (sort.createdAt === -1) {
      orderBy = 'ORDER BY sg."createdAt" DESC';
    } else if (sort.createdAt === 1) {
      orderBy = 'ORDER BY sg."createdAt" ASC';
    }

    // Add pagination with LIMIT and OFFSET
    const queryText = `
      SELECT sg.*, gn.name as god_name 
      FROM sub_god_names sg
      LEFT JOIN god_names gn ON sg."godNameId" = gn.id
      ${whereClause}
      ${orderBy}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await query(queryText, values);
    
    return result.rows.map(row => {
      const subGodName = new SubGodName(row);
      subGodName.godName = { name: row.god_name };
      return subGodName;
    });
  }

  // Static method to count documents with filters (for pagination)
  static async countDocuments(filterQuery = {}) {
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramCount = 1;

    // Filter by god name ID
    if (filterQuery.godNameId) {
      whereClause += ` AND "godNameId" = $${paramCount}`;
      values.push(parseInt(filterQuery.godNameId));
      paramCount++;
    }

    // Search by name
    if (filterQuery.name) {
      if (filterQuery.name.$regex) {
        whereClause += ` AND name ILIKE $${paramCount}`;
        values.push(filterQuery.name.$regex);
        paramCount++;
      } else if (typeof filterQuery.name === 'string') {
        whereClause += ` AND name ILIKE $${paramCount}`;
        values.push(`%${filterQuery.name}%`);
        paramCount++;
      }
    }

    // Search in description
    if (filterQuery.description) {
      if (filterQuery.description.$regex) {
        whereClause += ` AND description ILIKE $${paramCount}`;
        values.push(filterQuery.description.$regex);
        paramCount++;
      } else if (typeof filterQuery.description === 'string') {
        whereClause += ` AND description ILIKE $${paramCount}`;
        values.push(`%${filterQuery.description}%`);
        paramCount++;
      }
    }

    // General search
    if (filterQuery.search) {
      whereClause += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      values.push(`%${filterQuery.search}%`);
      values.push(`%${filterQuery.search}%`);
      paramCount += 2;
    }

    const result = await query(`SELECT COUNT(*) as count FROM sub_god_names ${whereClause}`, values);
    return parseInt(result.rows[0].count);
  }

  // Static method to find one sub god name
  static async findOne(conditions) {
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (conditions.name) {
      if (conditions.name.$regex) {
        whereClause += ` AND name ILIKE $${paramCount}`;
        values.push(conditions.name.$regex);
        paramCount++;
      } else if (typeof conditions.name === 'string') {
        // Exact match or partial match
        if (conditions.exact) {
          whereClause += ` AND LOWER(name) = LOWER($${paramCount})`;
          values.push(conditions.name);
        } else {
          whereClause += ` AND name ILIKE $${paramCount}`;
          values.push(`%${conditions.name}%`);
        }
        paramCount++;
      }
    }

    if (conditions.godNameId) {
      whereClause += ` AND "godNameId" = $${paramCount}`;
      values.push(parseInt(conditions.godNameId));
      paramCount++;
    }

    if (conditions.id) {
      whereClause += ` AND id = $${paramCount}`;
      values.push(parseInt(conditions.id));
      paramCount++;
    }

    // Use indexed column for better performance
    const result = await query(
      `SELECT * FROM sub_god_names ${whereClause} LIMIT 1`,
      values
    );
    if (result.rows.length === 0) return null;

    return new SubGodName(result.rows[0]);
  }

  // Static method to find and update
  static async findByIdAndUpdate(id, updateData, options = {}) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (key === 'godNameId') {
        fields.push(`"godNameId" = $${paramCount}`);
      } else if (key === 'updatedBy') {
        fields.push(`"updatedBy" = $${paramCount}`);
      } else {
        fields.push(`"${key}" = $${paramCount}`);
      }
      values.push(value);
      paramCount++;
    }

    // Add updatedAt
    fields.push(`"updatedAt" = CURRENT_TIMESTAMP`);

    values.push(id);
    const updateQuery = `UPDATE sub_god_names SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await query(updateQuery, values);

    if (result.rows.length === 0) return null;

    return new SubGodName(result.rows[0]);
  }

  // Static method to find and delete
  static async findByIdAndDelete(id) {
    const result = await query('DELETE FROM sub_god_names WHERE id = $1 RETURNING *', [id]);
    return result.rows.length > 0 ? new SubGodName(result.rows[0]) : null;
  }

  // Instance method to save sub god name
  async save() {
    const result = await query(
      `UPDATE sub_god_names SET name = $1, description = $2, "godNameId" = $3, "updatedAt" = CURRENT_TIMESTAMP 
       WHERE id = $4 RETURNING *`,
      [this.name, this.description, this.godNameId, this.id]
    );

    return new SubGodName(result.rows[0]);
  }
}

module.exports = SubGodName;

