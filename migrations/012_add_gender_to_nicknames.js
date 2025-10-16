/**
 * Migration: 012_add_gender_to_nicknames
 * Description: Add gender column to nicknames table
 * Created: 2025-01-03
 */

exports.up = async function(query) {
  console.log('Adding gender column to nicknames table...');
  
  // Add gender column to nicknames table
  await query(`
    ALTER TABLE nicknames 
    ADD COLUMN gender VARCHAR(10) DEFAULT 'unisex' 
    CHECK (gender IN ('male', 'female', 'unisex'))
  `);
  
  // Create index for gender column
  await query('CREATE INDEX IF NOT EXISTS idx_nicknames_gender ON nicknames(gender)');
  
  console.log('✅ Gender column added to nicknames table successfully');
};

exports.down = async function(query) {
  console.log('Removing gender column from nicknames table...');
  
  // Drop index first
  await query('DROP INDEX IF EXISTS idx_nicknames_gender');
  
  // Drop gender column
  await query('ALTER TABLE nicknames DROP COLUMN IF EXISTS gender');
  
  console.log('✅ Gender column removed from nicknames table successfully');
};
