const { query } = require('../config/database');

class Origin {
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

  // Static method to create a new origin
  static async create(originData) {
    const { name, createdBy } = originData;
    
    const result = await query(
      `INSERT INTO origins (name, "createdBy") 
       VALUES ($1, $2) 
       RETURNING *`,
      [name, createdBy]
    );

    return new Origin(result.rows[0]);
  }

  // Static method to find origin by ID
  static async findById(id) {
    const result = await query(`
      SELECT o.*, 
             cb.name as created_by_name, cb.email as created_by_email,
             ub.name as updated_by_name, ub.email as updated_by_email
      FROM origins o
      LEFT JOIN users cb ON o."createdBy" = cb.id
      LEFT JOIN users ub ON o."updatedBy" = ub.id
      WHERE o.id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const origin = new Origin(result.rows[0]);
    origin.createdByUser = {
      name: result.rows[0].created_by_name,
      email: result.rows[0].created_by_email
    };
    origin.updatedByUser = {
      name: result.rows[0].updated_by_name,
      email: result.rows[0].updated_by_email
    };
    return origin;
  }

  // Static method to find origins with filters
  static async find(filterQuery = {}, options = {}) {
    const { sort = { name: 1 } } = options;
    
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filterQuery.isActive !== undefined) {
      whereClause += ` AND o."isActive" = $${paramCount}`;
      values.push(filterQuery.isActive);
      paramCount++;
    }

    if (filterQuery.name) {
      if (filterQuery.name.$regex) {
        whereClause += ` AND o.name ILIKE $${paramCount}`;
        values.push(filterQuery.name.$regex);
        paramCount++;
      }
    }

    // Build ORDER BY clause
    let orderBy = 'ORDER BY o.name ASC';
    if (sort.name === -1) {
      orderBy = 'ORDER BY o.name DESC';
    }

    const queryText = `
      SELECT o.*, 
             cb.name as created_by_name, cb.email as created_by_email,
             ub.name as updated_by_name, ub.email as updated_by_email
      FROM origins o
      LEFT JOIN users cb ON o."createdBy" = cb.id
      LEFT JOIN users ub ON o."updatedBy" = ub.id
      ${whereClause}
      ${orderBy}
    `;

    const result = await query(queryText, values);
    
    return result.rows.map(row => {
      const origin = new Origin(row);
      origin.createdByUser = {
        name: row.created_by_name,
        email: row.created_by_email
      };
      origin.updatedByUser = {
        name: row.updated_by_name,
        email: row.updated_by_email
      };
      return origin;
    });
  }

  // Static method to find one origin
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

    const result = await query(`SELECT * FROM origins ${whereClause} LIMIT 1`, values);
    return result.rows.length > 0 ? new Origin(result.rows[0]) : null;
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
    const updateQuery = `UPDATE origins SET ${fields.join(', ')}, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;
    const result = await query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    return new Origin(result.rows[0]);
  }

  // Instance method to save origin
  async save() {
    const result = await query(
      `UPDATE origins SET name = $1, "isActive" = $2, "updatedBy" = $3, "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [this.name, this.isActive, this.updatedBy, this.id]
    );

    return new Origin(result.rows[0]);
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

module.exports = Origin;

