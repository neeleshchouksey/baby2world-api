/**
 * Migration: 022_create_pages_table
 * Description: Create pages table for custom admin-created pages with SEO support
 * Created: 2025-01-XX
 */

const { query } = require('../config/database');

exports.up = async function(query) {
  console.log('Creating pages table...');
  
  await query(`
    CREATE TABLE IF NOT EXISTS pages (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      content TEXT NOT NULL,
      meta_title VARCHAR(255),
      meta_description TEXT,
      meta_keywords VARCHAR(500),
      "isActive" BOOLEAN DEFAULT true NOT NULL,
      "createdBy" INTEGER REFERENCES users(id) ON DELETE CASCADE,
      "updatedBy" INTEGER REFERENCES users(id) ON DELETE SET NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await query('CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug)');
  await query('CREATE INDEX IF NOT EXISTS idx_pages_is_active ON pages("isActive")');
  await query('CREATE INDEX IF NOT EXISTS idx_pages_title ON pages(title)');
  
  console.log('✅ Pages table created successfully');
};

exports.down = async function(query) {
  console.log('Dropping pages table...');
  
  await query('DROP INDEX IF EXISTS idx_pages_title');
  await query('DROP INDEX IF EXISTS idx_pages_is_active');
  await query('DROP INDEX IF EXISTS idx_pages_slug');
  await query('DROP TABLE IF EXISTS pages CASCADE');
  
  console.log('✅ Pages table dropped successfully');
};

