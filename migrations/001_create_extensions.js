/**
 * Migration: 001_create_extensions
 * Description: DISABLED - UUID extensions no longer needed (converted to SERIAL)
 * Created: 2025-01-03
 * Status: DISABLED
 */

exports.up = async function(query) {
  console.log('Skipping PostgreSQL extensions (UUID no longer used)...');
  // No longer needed - using SERIAL instead of UUID
};

exports.down = async function(query) {
  console.log('Skipping PostgreSQL extensions (UUID no longer used)...');
  // No longer needed - using SERIAL instead of UUID
};
