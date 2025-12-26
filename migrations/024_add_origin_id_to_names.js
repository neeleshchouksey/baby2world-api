/**
 * Migration: 024_add_origin_id_to_names
 * Description: Add originId column to names table (optional, like religionId)
 * Created: 2025-12-25
 */

exports.up = async function(query) {
  console.log('Adding originId column to names table...');
  
  // Add originId column (nullable, like religionId)
  await query(`
    ALTER TABLE names 
    ADD COLUMN IF NOT EXISTS "originId" INTEGER REFERENCES origins(id) ON DELETE SET NULL
  `);
  
  // Create index for faster lookups
  await query('CREATE INDEX IF NOT EXISTS idx_names_origin_id ON names("originId")');
  
  console.log('✅ originId column added to names table successfully');
};

exports.down = async function(query) {
  console.log('Removing originId column from names table...');
  
  // Drop index first
  await query('DROP INDEX IF EXISTS idx_names_origin_id');
  
  // Drop column
  await query('ALTER TABLE names DROP COLUMN IF EXISTS "originId"');
  
  console.log('✅ originId column removed from names table successfully');
};

