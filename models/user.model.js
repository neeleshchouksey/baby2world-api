const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.id = data.id;
    // Handle PostgreSQL column name variations (quoted identifiers preserve case)
    this.googleId = data.googleId || data['googleId'] || data.google_id || data['google_id'] || null;
    this.name = data.name;
    this.email = data.email;
    this.picture = data.picture;
    this.password = data.password;
    this.role = data.role;
    // Handle isActive with multiple variations
    this.isActive = data.isActive !== undefined ? data.isActive : 
                    (data['isActive'] !== undefined ? data['isActive'] : 
                    (data.is_active !== undefined ? data.is_active : 
                    (data['is_active'] !== undefined ? data['is_active'] : true)));
    // Handle createdAt/updatedAt with multiple variations
    this.createdAt = data.createdAt || data['createdAt'] || data.created_at || data['created_at'] || null;
    this.updatedAt = data.updatedAt || data['updatedAt'] || data.updated_at || data['updated_at'] || null;
  }


  // Static method to create a new user
  static async create(userData) {
    const { googleId, name, email, picture, password, role = 'user' } = userData;
    
    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const result = await query(
      `INSERT INTO users ("googleId", name, email, picture, password, role) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [googleId, name, email, picture, hashedPassword, role]
    );

    return new User(result.rows[0]);
  }

  // Static method to find user by ID
  static async findById(id) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Static method to find user by email
  static async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Static method to find user by Google ID
  static async findByGoogleId(googleId) {
    const result = await query('SELECT * FROM users WHERE "googleId" = $1', [googleId]);
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Mongoose-like findOne supporting { email }
  static async findOne(conditions) {
    if (!conditions || typeof conditions !== 'object') return null;
    if (conditions.email) {
      return await User.findByEmail(conditions.email);
    }
    if (conditions.id) {
      return await User.findById(conditions.id);
    }
    return null;
  }

  // Static method to find and update user
  static async findByIdAndUpdate(id, updateData, options = {}) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic update query
    // Map camelCase keys to quoted column names
    const columnMap = {
      googleId: '"googleId"',
      isActive: '"isActive"',
      createdAt: '"createdAt"',
      updatedAt: '"updatedAt"'
    };
    
    for (const [key, value] of Object.entries(updateData)) {
      if (key === '$addToSet' || key === '$pull') {
        // Handle array operations
        continue;
      }
      // Use quoted column name if it's a camelCase column, otherwise use key as-is
      const columnName = columnMap[key] || key;
      fields.push(`${columnName} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }

    if (fields.length === 0) {
      // Handle array operations separately
      if (updateData.$addToSet) {
        for (const [field, value] of Object.entries(updateData.$addToSet)) {
          if (field === 'favorites') {
            await query(
              'INSERT INTO user_favorite_names ("userId", "nameId") VALUES ($1, $2) ON CONFLICT ("userId", "nameId") DO NOTHING',
              [id, value]
            );
          } else if (field === 'godNameFavorites') {
            await query(
              'INSERT INTO user_favorite_god_names ("userId", "godNameId") VALUES ($1, $2) ON CONFLICT ("userId", "godNameId") DO NOTHING',
              [id, value]
            );
          } else if (field === 'nicknameFavorites') {
            await query(
              'INSERT INTO user_favorite_nicknames ("userId", "nicknameId") VALUES ($1, $2) ON CONFLICT ("userId", "nicknameId") DO NOTHING',
              [id, value]
            );
          }
        }
      }
      if (updateData.$pull) {
        for (const [field, value] of Object.entries(updateData.$pull)) {
          if (field === 'favorites') {
            await query(
              'DELETE FROM user_favorite_names WHERE "userId" = $1 AND "nameId" = $2',
              [id, value]
            );
          } else if (field === 'godNameFavorites') {
            await query(
              'DELETE FROM user_favorite_god_names WHERE "userId" = $1 AND "godNameId" = $2',
              [id, value]
            );
          } else if (field === 'nicknameFavorites') {
            await query(
              'DELETE FROM user_favorite_nicknames WHERE "userId" = $1 AND "nicknameId" = $2',
              [id, value]
            );
          }
        }
      }
    } else {
      values.push(id);
      const updateQuery = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await query(updateQuery, values);
      
      if (result.rows.length === 0) {
        return null;
      }
    }

    // Return updated user
    return await User.findById(id);
  }

  // Instance method to compare password
  async comparePassword(enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
  }

  // Instance method to save user
  async save() {
    if (this.password && this.password.length < 60) {
      // Hash password if it's not already hashed
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    const result = await query(
      `UPDATE users SET name = $1, email = $2, picture = $3, password = $4, role = $5, 
       "googleId" = $6, "isActive" = $7, "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [this.name, this.email, this.picture, this.password, this.role, 
       this.googleId, this.isActive, this.id]
    );

    return new User(result.rows[0]);
  }

  // Mongoose-like select: supports '-password' projection
  select(projection) {
    const data = {
      id: this.id,
      googleId: this.googleId,
      name: this.name,
      email: this.email,
      picture: this.picture,
      password: this.password,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
    if (typeof projection === 'string' && projection.includes('-password')) {
      delete data.password;
    }
    return data;
  }

  // Instance method to match Mongoose's toJSON behavior
  toJSON() {
    return {
      id: this.id,
      googleId: this.googleId,
      name: this.name,
      email: this.email,
      picture: this.picture,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // Method to get user favorites with populated data
  async getFavorites() {
    const result = await query(`
      SELECT n.*, r.name as religion_name 
      FROM user_favorite_names ufn
      JOIN names n ON ufn."nameId" = n.id
      LEFT JOIN religions r ON n."religionId" = r.id
      WHERE ufn."userId" = $1
      ORDER BY n.name
    `, [this.id]);

    return result.rows;
  }

  // Method to get god name favorites with populated data
  async getGodNameFavorites() {
    const result = await query(`
      SELECT gn.*, r.name as religion_name 
      FROM user_favorite_god_names ufgn
      JOIN god_names gn ON ufgn."godNameId" = gn.id
      LEFT JOIN religions r ON gn."religionId" = r.id
      WHERE ufgn."userId" = $1
      ORDER BY gn.name
    `, [this.id]);

    return result.rows;
  }

  // Method to get nickname favorites with populated data
  async getNicknameFavorites() {
    const result = await query(`
      SELECT n.* 
      FROM user_favorite_nicknames ufn
      JOIN nicknames n ON ufn."nicknameId" = n.id
      WHERE ufn."userId" = $1
      ORDER BY n.name
    `, [this.id]);

    return result.rows;
  }

  // Method to check if a name is in favorites
  async hasFavoriteName(nameId) {
    const result = await query(
      'SELECT 1 FROM user_favorite_names WHERE "userId" = $1 AND "nameId" = $2',
      [this.id, nameId]
    );
    return result.rows.length > 0;
  }

  // Method to check if a god name is in favorites
  async hasFavoriteGodName(godNameId) {
    const result = await query(
      'SELECT 1 FROM user_favorite_god_names WHERE "userId" = $1 AND "godNameId" = $2',
      [this.id, godNameId]
    );
    return result.rows.length > 0;
  }

  // Method to check if a nickname is in favorites
  async hasFavoriteNickname(nicknameId) {
    const result = await query(
      'SELECT 1 FROM user_favorite_nicknames WHERE "userId" = $1 AND "nicknameId" = $2',
      [this.id, nicknameId]
    );
    return result.rows.length > 0;
  }
}


module.exports = User;