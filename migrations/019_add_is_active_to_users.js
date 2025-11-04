// Migration: Add is_active field to users table
// Description: Add is_active field for user deactivation functionality

const { query } = require('../config/database');

module.exports = {
  up: async () => {
    console.log('Adding is_active field to users table...');
    
    // Add is_active column if it doesn't exist
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
    `);
    
    // Create index for is_active
    await query('CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)');
    
    console.log('✅ is_active field added to users table successfully');
  },
  
  down: async () => {
    console.log('Removing is_active field from users table...');
    
    // Drop index first
    await query('DROP INDEX IF EXISTS idx_users_is_active');
    
    // Drop column
    await query('ALTER TABLE users DROP COLUMN IF EXISTS is_active');
    
    console.log('✅ is_active field removed from users table successfully');
  }
};

