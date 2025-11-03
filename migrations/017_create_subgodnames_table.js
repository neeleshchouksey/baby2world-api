// Migration: Create subgodnames table
// Description: Create subgodnames table for storing sub-god names as separate entities with id, name, description, god_name_id

const { query } = require('../config/database');

module.exports = {
  up: async () => {
    console.log('Creating subgodnames table...');
    
    // Create subgodnames table
    await query(`
      CREATE TABLE IF NOT EXISTS subgodnames (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        god_name_id INTEGER NOT NULL REFERENCES god_names(id) ON DELETE CASCADE,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for subgodnames
    await query('CREATE INDEX IF NOT EXISTS idx_subgodnames_god_name_id ON subgodnames(god_name_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_subgodnames_name ON subgodnames(name)');
    
    console.log('✅ Subgodnames table created successfully');
  },
  
  down: async () => {
    console.log('Dropping subgodnames table...');
    
    // Drop indexes first
    await query('DROP INDEX IF EXISTS idx_subgodnames_name');
    await query('DROP INDEX IF EXISTS idx_subgodnames_god_name_id');
    
    // Drop table
    await query('DROP TABLE IF EXISTS subgodnames CASCADE');
    
    console.log('✅ Subgodnames table dropped successfully');
  }
};

