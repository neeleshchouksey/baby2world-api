const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class AdminUser {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.picture = data.picture;
    this.createdAt = data.createdAt || data.created_at;
    this.updatedAt = data.updatedAt || data.updated_at;
  }

  static async findByEmail(email) {
    const result = await query('SELECT * FROM admin_users WHERE email = $1', [email]);
    return result.rows.length ? new AdminUser(result.rows[0]) : null;
  }

  static async findById(id) {
    const result = await query('SELECT * FROM admin_users WHERE id = $1', [id]);
    return result.rows.length ? new AdminUser(result.rows[0]) : null;
  }

  async comparePassword(enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      picture: this.picture,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = AdminUser;


