/**
 * Migration: 007_create_nicknames_table
 * Description: Create nicknames table for nickname suggestions
 * Created: 2025-01-03
 */

exports.up = async function(query) {
  console.log('Creating nicknames table...');
  
  // Create nicknames table
  await query(`
    CREATE TABLE IF NOT EXISTS nicknames (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes for nicknames
  await query('CREATE INDEX IF NOT EXISTS idx_nicknames_name ON nicknames(name)');
  await query('CREATE INDEX IF NOT EXISTS idx_nicknames_is_active ON nicknames(is_active)');
  await query('CREATE INDEX IF NOT EXISTS idx_nicknames_created_by ON nicknames(created_by)');
  
  console.log('✅ Nicknames table created successfully');
};

exports.down = async function(query) {
  console.log('Dropping nicknames table...');
  
  // Drop indexes first
  await query('DROP INDEX IF EXISTS idx_nicknames_name');
  await query('DROP INDEX IF EXISTS idx_nicknames_is_active');
  await query('DROP INDEX IF EXISTS idx_nicknames_created_by');
  
  // Drop table
  await query('DROP TABLE IF EXISTS nicknames CASCADE');
  
  console.log('✅ Nicknames table dropped successfully');
};
