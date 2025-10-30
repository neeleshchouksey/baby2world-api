// Migration: Split admins into separate admin_users table and migrate existing admins

const { query } = require('../config/database');

module.exports = {
  up: async () => {
    // 1) Create admin_users table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        picture VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 2) Copy admins from users (role='admin') to admin_users
    await query(`
      INSERT INTO admin_users (name, email, password, picture, created_at, updated_at)
      SELECT name, email, password, picture, created_at, updated_at
      FROM users
      WHERE role = 'admin'
      ON CONFLICT (email) DO NOTHING
    `);

    // 3) Remove those admins from users
    await query(`DELETE FROM users WHERE role = 'admin'`);

    // NOTE: We keep the users.role column as-is to avoid breaking older code paths.
    // If you want to remove it later, add a separate migration after all code paths are updated.
  },

  down: async () => {
    // Revert: move admins back into users with role='admin' (if role col exists), then drop admin_users
    try {
      await query(`
        INSERT INTO users (name, email, password, picture, role, created_at, updated_at)
        SELECT name, email, password, picture, 'admin', created_at, updated_at
        FROM admin_users
        ON CONFLICT (email) DO NOTHING
      `);
    } catch (e) {
      // If users.role doesn't exist, skip moving back
      console.warn('Warning: Could not move admins back to users (role column may be missing). Proceeding to drop table.');
    }

    await query(`DROP TABLE IF EXISTS admin_users`);
  }
};


