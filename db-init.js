require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, query } = require('./config/database');

async function runSchema() {
  const schemaPath = path.join(__dirname, 'config', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  // Split on semicolons carefully? Here we send raw text; pg can handle multiple statements
  await query(sql);
}

async function dropExistingTriggers() {
  // Make schema application idempotent by dropping triggers if they already exist
  const dropSql = `
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at'
      ) THEN
        EXECUTE 'DROP TRIGGER update_users_updated_at ON users';
      END IF;
      IF EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_religions_updated_at'
      ) THEN
        EXECUTE 'DROP TRIGGER update_religions_updated_at ON religions';
      END IF;
      IF EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_names_updated_at'
      ) THEN
        EXECUTE 'DROP TRIGGER update_names_updated_at ON names';
      END IF;
      IF EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_god_names_updated_at'
      ) THEN
        EXECUTE 'DROP TRIGGER update_god_names_updated_at ON god_names';
      END IF;
      IF EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_nicknames_updated_at'
      ) THEN
        EXECUTE 'DROP TRIGGER update_nicknames_updated_at ON nicknames';
      END IF;
    END$$;
  `;
  try {
    await query(dropSql);
  } catch (err) {
    console.warn('Warning: could not drop existing triggers:', err.message || err);
  }
}

async function seedInitialData() {
  if (process.env.SEED !== 'true') return;
  // Example: ensure an admin exists
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  try {
    await query('DELETE FROM users WHERE email = $1', [adminEmail]);
    const User = require('./models/user.model');
    await User.create({ name: 'Admin User', email: adminEmail, password: adminPassword, role: 'admin' });
    console.log('Seeded admin user');
  } catch (err) {
    console.error('Seed error:', err.message || err);
  }
}

async function main() {
  console.log('Initializing database...');
  try {
    await dropExistingTriggers();
    await runSchema();
    console.log('Schema applied successfully');
    await seedInitialData();
    console.log('Initialization complete');
  } catch (err) {
    console.error('DB init failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { runSchema, seedInitialData };


