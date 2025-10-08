/**
 * Migration: 003_create_religions_table
 * Description: Create religions table for categorizing names by religion
 * Created: 2025-01-03
 */

exports.up = async function(query) {
  console.log('Creating religions table...');
  
  // Create religions table
  await query(`
    CREATE TABLE IF NOT EXISTS religions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(50) UNIQUE NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_by UUID REFERENCES users(id) ON DELETE CASCADE,
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes for religions
  await query('CREATE INDEX IF NOT EXISTS idx_religions_name ON religions(name)');
  await query('CREATE INDEX IF NOT EXISTS idx_religions_is_active ON religions(is_active)');
  
  console.log('✅ Religions table created successfully');
};

exports.down = async function(query) {
  console.log('Dropping religions table...');
  
  // Drop indexes first
  await query('DROP INDEX IF EXISTS idx_religions_name');
  await query('DROP INDEX IF EXISTS idx_religions_is_active');
  
  // Drop table
  await query('DROP TABLE IF EXISTS religions CASCADE');
  
  console.log('✅ Religions table dropped successfully');
};
