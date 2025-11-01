// Migration: Make nicknames.created_by nullable for admin_users split
// After splitting admins to admin_users table, admins create items but created_by references users.id
// So we make created_by nullable to allow admin-created nicknames

const { query } = require('../config/database');

module.exports = {
  up: async () => {
    console.log('Making nicknames.created_by nullable...');
    
    // Drop the existing foreign key constraint
    await query(`
      ALTER TABLE nicknames 
      DROP CONSTRAINT IF EXISTS nicknames_created_by_fkey;
    `);
    
    // Make created_by nullable
    await query(`
      ALTER TABLE nicknames 
      ALTER COLUMN created_by DROP NOT NULL;
    `);
    
    // Recreate foreign key with ON DELETE SET NULL (allows NULL values)
    await query(`
      ALTER TABLE nicknames 
      ADD CONSTRAINT nicknames_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    `);
    
    console.log('✅ Made nicknames.created_by nullable successfully');
  },
  
  down: async () => {
    console.log('Reverting nicknames.created_by to NOT NULL...');
    
    // Note: Can't easily revert because we'd need to update NULL values first
    // This migration is one-way in practice
    console.warn('⚠️  Migration down not implemented - would require updating NULL values first');
  }
};

