/**
 * Migration: 006_create_god_name_sub_names_table
 * Description: Create god_name_sub_names table for storing sub-names of god names
 * Created: 2025-01-03
 */

exports.up = async function(query) {
  console.log('Creating god_name_sub_names table...');
  
  // Create god_name_sub_names table
  await query(`
    CREATE TABLE IF NOT EXISTS god_name_sub_names (
      id SERIAL PRIMARY KEY,
      god_name_id INTEGER NOT NULL REFERENCES god_names(id) ON DELETE CASCADE,
      sub_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create index for god_name_sub_names
  await query('CREATE INDEX IF NOT EXISTS idx_god_name_sub_names_god_name_id ON god_name_sub_names(god_name_id)');
  
  console.log('✅ God name sub names table created successfully');
};

exports.down = async function(query) {
  console.log('Dropping god_name_sub_names table...');
  
  // Drop indexes first
  await query('DROP INDEX IF EXISTS idx_god_name_sub_names_god_name_id');
  
  // Drop table
  await query('DROP TABLE IF EXISTS god_name_sub_names CASCADE');
  
  console.log('✅ God name sub names table dropped successfully');
};
