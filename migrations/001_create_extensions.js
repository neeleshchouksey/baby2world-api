/**
 * Migration: 001_create_extensions
 * Description: Create PostgreSQL extensions required for the application
 * Created: 2025-01-03
 */

exports.up = async function(query) {
  console.log('Creating PostgreSQL extensions...');
  
  // Enable UUID extension for generating UUIDs
  await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  
  console.log('✅ Extensions created successfully');
};

exports.down = async function(query) {
  console.log('Dropping PostgreSQL extensions...');
  
  // Drop UUID extension
  await query('DROP EXTENSION IF EXISTS "uuid-ossp"');
  
  console.log('✅ Extensions dropped successfully');
};
