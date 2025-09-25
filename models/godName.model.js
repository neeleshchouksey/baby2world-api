const { query, getClient } = require('../config/database');

class GodName {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.religionId = data.religion_id;
    this.createdBy = data.created_by;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.subNames = data.sub_names || [];
    // For populated data
    this.religion = data.religion;
  }

  // Static method to create a new god name
  static async create(godNameData) {
    const { name, description, religionId, subNames = [], createdBy } = godNameData;
    
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO god_names (name, description, religion_id, created_by) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [name, description, religionId, createdBy]
      );

      const godName = new GodName(result.rows[0]);

      if (subNames.length > 0) {
        for (const subName of subNames) {
          await client.query(
            'INSERT INTO god_name_sub_names (god_name_id, sub_name) VALUES ($1, $2)',
            [godName.id, subName]
          );
        }
        godName.subNames = subNames;
      }

      await client.query('COMMIT');
      return godName;
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }

  // Static method to find god name by ID
  static async findById(id) {
    const result = await query(`
      SELECT gn.*, r.name as religion_name 
      FROM god_names gn
      LEFT JOIN religions r ON gn.religion_id = r.id
      WHERE gn.id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const godName = new GodName(result.rows[0]);
    godName.religion = { name: result.rows[0].religion_name };

    // Get sub names
    const subNamesResult = await query(
      'SELECT sub_name FROM god_name_sub_names WHERE god_name_id = $1 ORDER BY created_at',
      [id]
    );
    godName.subNames = subNamesResult.rows.map(row => row.sub_name);

    return godName;
  }

  // Static method to find god names with filters
  static async find(filterQuery = {}, options = {}) {
    const { sort = { name: 1 } } = options;
    
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filterQuery.religionId) {
      whereClause += ` AND gn.religion_id = $${paramCount}`;
      values.push(filterQuery.religionId);
      paramCount++;
    }

    if (filterQuery.name) {
      if (filterQuery.name.$regex) {
        whereClause += ` AND gn.name ILIKE $${paramCount}`;
        values.push(filterQuery.name.$regex);
        paramCount++;
      }
    }

    // Build ORDER BY clause
    let orderBy = 'ORDER BY gn.name ASC';
    if (sort.name === -1) {
      orderBy = 'ORDER BY gn.name DESC';
    }

    const queryText = `
      SELECT gn.*, r.name as religion_name 
      FROM god_names gn
      LEFT JOIN religions r ON gn.religion_id = r.id
      ${whereClause}
      ${orderBy}
    `;

    const result = await query(queryText, values);
    
    const godNames = [];
    for (const row of result.rows) {
      const godName = new GodName(row);
      godName.religion = { name: row.religion_name };

      // Get sub names for each god name
      const subNamesResult = await query(
        'SELECT sub_name FROM god_name_sub_names WHERE god_name_id = $1 ORDER BY created_at',
        [godName.id]
      );
      godName.subNames = subNamesResult.rows.map(subRow => subRow.sub_name);

      godNames.push(godName);
    }

    return godNames;
  }

  // Static method to find one god name
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

    if (conditions.religionId) {
      whereClause += ` AND religion_id = $${paramCount}`;
      values.push(conditions.religionId);
      paramCount++;
    }

    const result = await query(`SELECT * FROM god_names ${whereClause} LIMIT 1`, values);
    if (result.rows.length === 0) return null;

    const godName = new GodName(result.rows[0]);

    // Get sub names
    const subNamesResult = await query(
      'SELECT sub_name FROM god_name_sub_names WHERE god_name_id = $1 ORDER BY created_at',
      [godName.id]
    );
    godName.subNames = subNamesResult.rows.map(row => row.sub_name);

    return godName;
  }

  // Static method to find and update
  static async findByIdAndUpdate(id, updateData, options = {}) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const fields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updateData)) {
        if (key === 'religionId') {
          fields.push(`religion_id = $${paramCount}`);
        } else if (key === 'subNames') {
          continue; // handled separately
        } else {
          fields.push(`${key} = $${paramCount}`);
        }
        values.push(value);
        paramCount++;
      }

      values.push(id);
      const updateQuery = `UPDATE god_names SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = fields.length > 0 ? await client.query(updateQuery, values) : await client.query('SELECT * FROM god_names WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const godName = new GodName(result.rows[0]);

      if (Array.isArray(updateData.subNames)) {
        await client.query('DELETE FROM god_name_sub_names WHERE god_name_id = $1', [id]);
        for (const subName of updateData.subNames) {
          await client.query(
            'INSERT INTO god_name_sub_names (god_name_id, sub_name) VALUES ($1, $2)',
            [id, subName]
          );
        }
        godName.subNames = updateData.subNames;
      } else {
        const subNamesResult = await client.query(
          'SELECT sub_name FROM god_name_sub_names WHERE god_name_id = $1 ORDER BY created_at',
          [id]
        );
        godName.subNames = subNamesResult.rows.map(row => row.sub_name);
      }

      await client.query('COMMIT');
      return godName;
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }

  // Static method to find and delete
  static async findByIdAndDelete(id) {
    // Delete sub names first
    await query('DELETE FROM god_name_sub_names WHERE god_name_id = $1', [id]);
    
    const result = await query('DELETE FROM god_names WHERE id = $1 RETURNING *', [id]);
    return result.rows.length > 0 ? new GodName(result.rows[0]) : null;
  }

  // Instance method to add sub name
  async addSubName(subName) {
    // Check if sub name already exists
    const existing = await query(
      'SELECT 1 FROM god_name_sub_names WHERE god_name_id = $1 AND sub_name = $2',
      [this.id, subName]
    );

    if (existing.rows.length > 0) {
      throw new Error('Sub name already exists');
    }

    await query(
      'INSERT INTO god_name_sub_names (god_name_id, sub_name) VALUES ($1, $2)',
      [this.id, subName]
    );

    this.subNames.push(subName);
    return this;
  }

  // Instance method to remove sub name
  async removeSubName(subName) {
    await query(
      'DELETE FROM god_name_sub_names WHERE god_name_id = $1 AND sub_name = $2',
      [this.id, subName]
    );

    this.subNames = this.subNames.filter(name => name !== subName);
    return this;
  }

  // Instance method to save god name
  async save() {
    const result = await query(
      `UPDATE god_names SET name = $1, description = $2, religion_id = $3 
       WHERE id = $4 RETURNING *`,
      [this.name, this.description, this.religionId, this.id]
    );

    return new GodName(result.rows[0]);
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

module.exports = GodName;