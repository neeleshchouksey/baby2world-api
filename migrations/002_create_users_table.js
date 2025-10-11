/**
 * Migration: 002_create_users_table
 * Description: Create users table for user authentication and management
 * Created: 2025-01-03
 */

exports.up = async function(query) {
  console.log('Creating users table...');
  
  // Create users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      google_id VARCHAR(255) UNIQUE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      picture TEXT,
      password VARCHAR(255),
      role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes for faster lookups
  await query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  await query('CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
  
  console.log('✅ Users table created successfully');
};

exports.down = async function(query) {
  console.log('Dropping users table...');
  
  // Drop indexes first
  await query('DROP INDEX IF EXISTS idx_users_email');
  await query('DROP INDEX IF EXISTS idx_users_google_id');
  await query('DROP INDEX IF EXISTS idx_users_role');
  
  // Drop table
  await query('DROP TABLE IF EXISTS users CASCADE');
  
  console.log('✅ Users table dropped successfully');
};
