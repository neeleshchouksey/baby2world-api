const { query, getClient } = require('../config/database');

class GodName {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.religionId = data.religionId || data.religion_id;
    this.createdBy = data.createdBy || data.created_by;
    this.createdAt = data.createdAt || data.created_at;
    this.updatedAt = data.updatedAt || data.updated_at;
    this.subNames = data.subNames || data.sub_names || [];
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
        `INSERT INTO god_names (name, description, "religionId", "createdBy") 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [name, description, religionId, createdBy]
      );

      const godName = new GodName(result.rows[0]);

      if (subNames.length > 0) {
        for (const subName of subNames) {
          await client.query(
            'INSERT INTO god_name_sub_names ("godNameId", "subName") VALUES ($1, $2)',
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
      LEFT JOIN religions r ON gn."religionId" = r.id
      WHERE gn.id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const godName = new GodName(result.rows[0]);
    godName.religion = { name: result.rows[0].religion_name };

    // Get sub names
    const subNamesResult = await query(
      'SELECT "subName" FROM god_name_sub_names WHERE "godNameId" = $1 ORDER BY "createdAt"',
      [id]
    );
    godName.subNames = subNamesResult.rows.map(row => row.subName);

    return godName;
  }

  // Static method to find god names with filters
  static async find(filterQuery = {}, options = {}) {
    const { sort = { name: 1 } } = options;
    
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filterQuery.religionId) {
      whereClause += ` AND gn."religionId" = $${paramCount}`;
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
      LEFT JOIN religions r ON gn."religionId" = r.id
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
        'SELECT "subName" FROM god_name_sub_names WHERE "godNameId" = $1 ORDER BY "createdAt"',
        [godName.id]
      );
      godName.subNames = subNamesResult.rows.map(subRow => subRow.subName);

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
      whereClause += ` AND "religionId" = $${paramCount}`;
      values.push(conditions.religionId);
      paramCount++;
    }

    const result = await query(`SELECT * FROM god_names ${whereClause} LIMIT 1`, values);
    if (result.rows.length === 0) return null;

    const godName = new GodName(result.rows[0]);

    // Get sub names
    const subNamesResult = await query(
      'SELECT "subName" FROM god_name_sub_names WHERE "godNameId" = $1 ORDER BY "createdAt"',
      [godName.id]
    );
    godName.subNames = subNamesResult.rows.map(row => row.subName);

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
          fields.push(`"religionId" = $${paramCount}`);
        } else if (key === 'subNames') {
          continue; // handled separately
        } else {
          fields.push(`"${key}" = $${paramCount}`);
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
        await client.query('DELETE FROM god_name_sub_names WHERE "godNameId" = $1', [id]);
        for (const subName of updateData.subNames) {
          await client.query(
            'INSERT INTO god_name_sub_names ("godNameId", "subName") VALUES ($1, $2)',
            [id, subName]
          );
        }
        godName.subNames = updateData.subNames;
      } else {
        const subNamesResult = await client.query(
          'SELECT "subName" FROM god_name_sub_names WHERE "godNameId" = $1 ORDER BY "createdAt"',
          [id]
        );
        godName.subNames = subNamesResult.rows.map(row => row.subName);
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
    await query('DELETE FROM god_name_sub_names WHERE "godNameId" = $1', [id]);
    
    const result = await query('DELETE FROM god_names WHERE id = $1 RETURNING *', [id]);
    return result.rows.length > 0 ? new GodName(result.rows[0]) : null;
  }

  // Instance method to add sub name
  async addSubName(subName) {
    // Check if sub name already exists
    const existing = await query(
      'SELECT 1 FROM god_name_sub_names WHERE "godNameId" = $1 AND "subName" = $2',
      [this.id, subName]
    );

    if (existing.rows.length > 0) {
      throw new Error('Sub name already exists');
    }

    await query(
      'INSERT INTO god_name_sub_names ("godNameId", "subName") VALUES ($1, $2)',
      [this.id, subName]
    );

    this.subNames.push(subName);
    return this;
  }

  // Instance method to remove sub name
  async removeSubName(subName) {
    await query(
      'DELETE FROM god_name_sub_names WHERE "godNameId" = $1 AND "subName" = $2',
      [this.id, subName]
    );

    this.subNames = this.subNames.filter(name => name !== subName);
    return this;
  }

  // Instance method to save god name
  async save() {
    const result = await query(
      `UPDATE god_names SET name = $1, description = $2, "religionId" = $3 
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