/**
 * Migration: 020_rename_subgodnames_to_sub_god_names
 * Description: Rename subgodnames table to sub_god_names for consistent snake_case naming
 * Created: 2025-01-XX
 */

exports.up = async function(query) {
  console.log('Renaming subgodnames table to sub_god_names...');
  
  // Check if table exists before renaming
  const checkTable = await query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'subgodnames'
    )
  `);
  
  if (checkTable.rows[0].exists) {
    // Rename table
    await query('ALTER TABLE subgodnames RENAME TO sub_god_names');
    
    // Rename indexes
    await query('ALTER INDEX IF EXISTS idx_subgodnames_god_name_id RENAME TO idx_sub_god_names_god_name_id');
    await query('ALTER INDEX IF EXISTS idx_subgodnames_name RENAME TO idx_sub_god_names_name');
    
    console.log('✅ Table renamed successfully');
  } else {
    console.log('⚠️  Table subgodnames does not exist, skipping rename');
  }
};

exports.down = async function(query) {
  console.log('Reverting sub_god_names table to subgodnames...');
  
  const checkTable = await query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'sub_god_names'
    )
  `);
  
  if (checkTable.rows[0].exists) {
    // Rename indexes back
    await query('ALTER INDEX IF EXISTS idx_sub_god_names_god_name_id RENAME TO idx_subgodnames_god_name_id');
    await query('ALTER INDEX IF EXISTS idx_sub_god_names_name RENAME TO idx_subgodnames_name');
    
    // Rename table back
    await query('ALTER TABLE sub_god_names RENAME TO subgodnames');
    
    console.log('✅ Table rename reverted successfully');
  } else {
    console.log('⚠️  Table sub_god_names does not exist, skipping revert');
  }
};
