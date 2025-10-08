/**
 * Migration: 008_create_user_favorite_names_table
 * Description: Create user_favorite_names junction table for many-to-many relationship
 * Created: 2025-01-03
 */

exports.up = async function(query) {
  console.log('Creating user_favorite_names table...');
  
  // Create user_favorite_names table
  await query(`
    CREATE TABLE IF NOT EXISTS user_favorite_names (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name_id UUID NOT NULL REFERENCES names(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, name_id)
    )
  `);
  
  // Create indexes for user_favorite_names
  await query('CREATE INDEX IF NOT EXISTS idx_user_favorite_names_user_id ON user_favorite_names(user_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_user_favorite_names_name_id ON user_favorite_names(name_id)');
  
  console.log('✅ User favorite names table created successfully');
};

exports.down = async function(query) {
  console.log('Dropping user_favorite_names table...');
  
  // Drop indexes first
  await query('DROP INDEX IF EXISTS idx_user_favorite_names_user_id');
  await query('DROP INDEX IF EXISTS idx_user_favorite_names_name_id');
  
  // Drop table
  await query('DROP TABLE IF EXISTS user_favorite_names CASCADE');
  
  console.log('✅ User favorite names table dropped successfully');
};
