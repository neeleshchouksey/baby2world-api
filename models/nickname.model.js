const { query } = require('../config/database');

class Nickname {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.createdBy = data.created_by;
    this.updatedBy = data.updated_by;
    this.isActive = data.is_active;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    // For populated data
    this.createdByUser = data.created_by_user;
    this.updatedByUser = data.updated_by_user;
  }

  // Static method to create a new nickname
  static async create(nicknameData) {
    const { name, description = '', createdBy } = nicknameData;
    
    const result = await query(
      `INSERT INTO nicknames (name, description, created_by) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [name, description, createdBy]
    );

    return new Nickname(result.rows[0]);
  }

  // Static method to find nickname by ID
  static async findById(id) {
    const result = await query(`
      SELECT n.*, 
             cb.name as created_by_name, cb.email as created_by_email,
             ub.name as updated_by_name, ub.email as updated_by_email
      FROM nicknames n
      LEFT JOIN users cb ON n.created_by = cb.id
      LEFT JOIN users ub ON n.updated_by = ub.id
      WHERE n.id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const nickname = new Nickname(result.rows[0]);
    nickname.createdByUser = {
      name: result.rows[0].created_by_name,
      email: result.rows[0].created_by_email
    };
    nickname.updatedByUser = {
      name: result.rows[0].updated_by_name,
      email: result.rows[0].updated_by_email
    };
    return nickname;
  }

  // Static method to find nicknames with filters
  static async find(filterQuery = {}, options = {}) {
    const { sort = { name: 1 } } = options;
    
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filterQuery.isActive !== undefined) {
      whereClause += ` AND n.is_active = $${paramCount}`;
      values.push(filterQuery.isActive);
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
      SELECT n.*, 
             cb.name as created_by_name, cb.email as created_by_email,
             ub.name as updated_by_name, ub.email as updated_by_email
      FROM nicknames n
      LEFT JOIN users cb ON n.created_by = cb.id
      LEFT JOIN users ub ON n.updated_by = ub.id
      ${whereClause}
      ${orderBy}
    `;

    const result = await query(queryText, values);
    
    return result.rows.map(row => {
      const nickname = new Nickname(row);
      nickname.createdByUser = {
        name: row.created_by_name,
        email: row.created_by_email
      };
      nickname.updatedByUser = {
        name: row.updated_by_name,
        email: row.updated_by_email
      };
      return nickname;
    });
  }

  // Static method to find one nickname
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
      whereClause += ` AND is_active = $${paramCount}`;
      values.push(conditions.isActive);
      paramCount++;
    }

    const result = await query(`SELECT * FROM nicknames ${whereClause} LIMIT 1`, values);
    return result.rows.length > 0 ? new Nickname(result.rows[0]) : null;
  }

  // Static method to find and update
  static async findByIdAndUpdate(id, updateData, options = {}) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (key === 'isActive') {
        fields.push(`is_active = $${paramCount}`);
      } else if (key === 'updatedBy') {
        fields.push(`updated_by = $${paramCount}`);
      } else {
        fields.push(`${key} = $${paramCount}`);
      }
      values.push(value);
      paramCount++;
    }

    values.push(id);
    const updateQuery = `UPDATE nicknames SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    return new Nickname(result.rows[0]);
  }

  // Instance method to save nickname
  async save() {
    const result = await query(
      `UPDATE nicknames SET name = $1, description = $2, is_active = $3, updated_by = $4 
       WHERE id = $5 RETURNING *`,
      [this.name, this.description, this.isActive, this.updatedBy, this.id]
    );

    return new Nickname(result.rows[0]);
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

module.exports = Nickname;