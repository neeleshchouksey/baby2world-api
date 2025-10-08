/**
 * Migration: 005_create_god_names_table
 * Description: Create god_names table for religious god names
 * Created: 2025-01-03
 */

exports.up = async function(query) {
  console.log('Creating god_names table...');
  
  // Create god_names table
  await query(`
    CREATE TABLE IF NOT EXISTS god_names (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      religion_id UUID NOT NULL REFERENCES religions(id) ON DELETE CASCADE,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes for god_names
  await query('CREATE INDEX IF NOT EXISTS idx_god_names_name ON god_names(name)');
  await query('CREATE INDEX IF NOT EXISTS idx_god_names_religion_id ON god_names(religion_id)');
  
  console.log('✅ God names table created successfully');
};

exports.down = async function(query) {
  console.log('Dropping god_names table...');
  
  // Drop indexes first
  await query('DROP INDEX IF EXISTS idx_god_names_name');
  await query('DROP INDEX IF EXISTS idx_god_names_religion_id');
  
  // Drop table
  await query('DROP TABLE IF EXISTS god_names CASCADE');
  
  console.log('✅ God names table dropped successfully');
};
