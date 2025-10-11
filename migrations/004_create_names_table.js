/**
 * Migration: 004_create_names_table
 * Description: Create names table for baby names with gender and religion associations
 * Created: 2025-01-03
 */

exports.up = async function(query) {
  console.log('Creating names table...');
  
  // Create names table
  await query(`
    CREATE TABLE IF NOT EXISTS names (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      religion_id INTEGER NOT NULL REFERENCES religions(id) ON DELETE CASCADE,
      gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'unisex')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes for names
  await query('CREATE INDEX IF NOT EXISTS idx_names_name ON names(name)');
  await query('CREATE INDEX IF NOT EXISTS idx_names_religion_id ON names(religion_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_names_gender ON names(gender)');
  
  console.log('✅ Names table created successfully');
};

exports.down = async function(query) {
  console.log('Dropping names table...');
  
  // Drop indexes first
  await query('DROP INDEX IF EXISTS idx_names_name');
  await query('DROP INDEX IF EXISTS idx_names_religion_id');
  await query('DROP INDEX IF EXISTS idx_names_gender');
  
  // Drop table
  await query('DROP TABLE IF EXISTS names CASCADE');
  
  console.log('✅ Names table dropped successfully');
};
