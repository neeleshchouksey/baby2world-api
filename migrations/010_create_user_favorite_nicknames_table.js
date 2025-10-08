/**
 * Migration: 010_create_user_favorite_nicknames_table
 * Description: Create user_favorite_nicknames junction table for many-to-many relationship
 * Created: 2025-01-03
 */

exports.up = async function(query) {
  console.log('Creating user_favorite_nicknames table...');
  
  // Create user_favorite_nicknames table
  await query(`
    CREATE TABLE IF NOT EXISTS user_favorite_nicknames (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nickname_id UUID NOT NULL REFERENCES nicknames(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, nickname_id)
    )
  `);
  
  // Create indexes for user_favorite_nicknames
  await query('CREATE INDEX IF NOT EXISTS idx_user_favorite_nicknames_user_id ON user_favorite_nicknames(user_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_user_favorite_nicknames_nickname_id ON user_favorite_nicknames(nickname_id)');
  
  console.log('✅ User favorite nicknames table created successfully');
};

exports.down = async function(query) {
  console.log('Dropping user_favorite_nicknames table...');
  
  // Drop indexes first
  await query('DROP INDEX IF EXISTS idx_user_favorite_nicknames_user_id');
  await query('DROP INDEX IF EXISTS idx_user_favorite_nicknames_nickname_id');
  
  // Drop table
  await query('DROP TABLE IF EXISTS user_favorite_nicknames CASCADE');
  
  console.log('✅ User favorite nicknames table dropped successfully');
};
