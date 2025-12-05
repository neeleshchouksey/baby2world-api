const { query } = require('../config/database');

class Religion {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.isActive = data.isActive !== undefined ? data.isActive : (data.is_active !== undefined ? data.is_active : true);
    this.createdBy = data.createdBy || data.created_by;
    this.updatedBy = data.updatedBy || data.updated_by;
    this.createdAt = data.createdAt || data.created_at;
    this.updatedAt = data.updatedAt || data.updated_at;
    // For populated data
    this.createdByUser = data.created_by_user;
    this.updatedByUser = data.updated_by_user;
  }

  // Static method to create a new religion
  static async create(religionData) {
    const { name, createdBy } = religionData;
    
    const result = await query(
      `INSERT INTO religions (name, "createdBy") 
       VALUES ($1, $2) 
       RETURNING *`,
      [name, createdBy]
    );

    return new Religion(result.rows[0]);
  }

  // Static method to find religion by ID
  static async findById(id) {
    const result = await query(`
      SELECT r.*, 
             cb.name as created_by_name, cb.email as created_by_email,
             ub.name as updated_by_name, ub.email as updated_by_email
      FROM religions r
      LEFT JOIN users cb ON r."createdBy" = cb.id
      LEFT JOIN users ub ON r."updatedBy" = ub.id
      WHERE r.id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const religion = new Religion(result.rows[0]);
    religion.createdByUser = {
      name: result.rows[0].created_by_name,
      email: result.rows[0].created_by_email
    };
    religion.updatedByUser = {
      name: result.rows[0].updated_by_name,
      email: result.rows[0].updated_by_email
    };
    return religion;
  }

  // Static method to find religions with filters
  static async find(filterQuery = {}, options = {}) {
    const { sort = { name: 1 } } = options;
    
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filterQuery.isActive !== undefined) {
      whereClause += ` AND r."isActive" = $${paramCount}`;
      values.push(filterQuery.isActive);
      paramCount++;
    }

    if (filterQuery.name) {
      if (filterQuery.name.$regex) {
        whereClause += ` AND r.name ILIKE $${paramCount}`;
        values.push(filterQuery.name.$regex);
        paramCount++;
      }
    }

    // Build ORDER BY clause
    let orderBy = 'ORDER BY r.name ASC';
    if (sort.name === -1) {
      orderBy = 'ORDER BY r.name DESC';
    }

    const queryText = `
      SELECT r.*, 
             cb.name as created_by_name, cb.email as created_by_email,
             ub.name as updated_by_name, ub.email as updated_by_email
      FROM religions r
      LEFT JOIN users cb ON r."createdBy" = cb.id
      LEFT JOIN users ub ON r."updatedBy" = ub.id
      ${whereClause}
      ${orderBy}
    `;

    const result = await query(queryText, values);
    
    return result.rows.map(row => {
      const religion = new Religion(row);
      religion.createdByUser = {
        name: row.created_by_name,
        email: row.created_by_email
      };
      religion.updatedByUser = {
        name: row.updated_by_name,
        email: row.updated_by_email
      };
      return religion;
    });
  }

  // Static method to find one religion
  static async findOne(conditions) {
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (conditions.name) {
      if (conditions.name.$regex) {
        whereClause += ` AND name ILIKE $${paramCount}`;
        values.push(conditions.name.$regex);
        paramCount++;
      }
    }

    if (conditions.isActive !== undefined) {
      whereClause += ` AND "isActive" = $${paramCount}`;
      values.push(conditions.isActive);
      paramCount++;
    }

    const result = await query(`SELECT * FROM religions ${whereClause} LIMIT 1`, values);
    return result.rows.length > 0 ? new Religion(result.rows[0]) : null;
  }

  // Static method to find and update
  static async findByIdAndUpdate(id, updateData, options = {}) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (key === 'isActive') {
        fields.push(`"isActive" = $${paramCount}`);
      } else if (key === 'updatedBy') {
        fields.push(`"updatedBy" = $${paramCount}`);
      } else {
        fields.push(`"${key}" = $${paramCount}`);
      }
      values.push(value);
      paramCount++;
    }

    values.push(id);
    const updateQuery = `UPDATE religions SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    return new Religion(result.rows[0]);
  }

  // Instance method to save religion
  async save() {
    const result = await query(
      `UPDATE religions SET name = $1, "isActive" = $2, "updatedBy" = $3 
       WHERE id = $4 RETURNING *`,
      [this.name, this.isActive, this.updatedBy, this.id]
    );

    return new Religion(result.rows[0]);
  }

  // Instance method to populate user references
  async populate(field, select = 'name email') {
    if (field === 'createdBy' && this.createdBy) {
      const result = await query(`SELECT ${select} FROM users WHERE id = $1`, [this.createdBy]);
      if (result.rows.length > 0) {
        this.createdByUser = result.rows[0];
      }
    }
    if (field === 'updatedBy' && this.updatedBy) {
      const result = await query(`SELECT ${select} FROM users WHERE id = $1`, [this.updatedBy]);
      if (result.rows.length > 0) {
        this.updatedByUser = result.rows[0];
      }
    }
    return this;
  }
}

module.exports = Religion;