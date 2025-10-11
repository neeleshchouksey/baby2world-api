/**
 * Migration: 009_create_user_favorite_god_names_table
 * Description: Create user_favorite_god_names junction table for many-to-many relationship
 * Created: 2025-01-03
 */

exports.up = async function(query) {
  console.log('Creating user_favorite_god_names table...');
  
  // Create user_favorite_god_names table
  await query(`
    CREATE TABLE IF NOT EXISTS user_favorite_god_names (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      god_name_id INTEGER NOT NULL REFERENCES god_names(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, god_name_id)
    )
  `);
  
  // Create indexes for user_favorite_god_names
  await query('CREATE INDEX IF NOT EXISTS idx_user_favorite_god_names_user_id ON user_favorite_god_names(user_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_user_favorite_god_names_god_name_id ON user_favorite_god_names(god_name_id)');
  
  console.log('✅ User favorite god names table created successfully');
};

exports.down = async function(query) {
  console.log('Dropping user_favorite_god_names table...');
  
  // Drop indexes first
  await query('DROP INDEX IF EXISTS idx_user_favorite_god_names_user_id');
  await query('DROP INDEX IF EXISTS idx_user_favorite_god_names_god_name_id');
  
  // Drop table
  await query('DROP TABLE IF EXISTS user_favorite_god_names CASCADE');
  
  console.log('✅ User favorite god names table dropped successfully');
};
