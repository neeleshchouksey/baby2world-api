/**
 * Migration: 023_create_origins_table
 * Description: Create origins table for categorizing names by origin
 * Created: 2025-12-25
 */

exports.up = async function(query) {
  console.log('Creating origins table...');
  
  // Create origins table
  await query(`
    CREATE TABLE IF NOT EXISTS origins (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      "isActive" BOOLEAN DEFAULT true NOT NULL,
      "createdBy" INTEGER REFERENCES users(id) ON DELETE CASCADE,
      "updatedBy" INTEGER REFERENCES users(id) ON DELETE SET NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes for origins
  await query('CREATE INDEX IF NOT EXISTS idx_origins_name ON origins(name)');
  await query('CREATE INDEX IF NOT EXISTS idx_origins_is_active ON origins("isActive")');
  
  console.log('✅ Origins table created successfully');
};

exports.down = async function(query) {
  console.log('Dropping origins table...');
  
  // Drop indexes first
  await query('DROP INDEX IF EXISTS idx_origins_name');
  await query('DROP INDEX IF EXISTS idx_origins_is_active');
  
  // Drop table
  await query('DROP TABLE IF EXISTS origins CASCADE');
  
  console.log('✅ Origins table dropped successfully');
};

