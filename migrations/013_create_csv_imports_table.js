/**
 * Migration: 013_create_csv_imports_table
 * Description: Create CSV imports tracking table for import history and rollback functionality
 * Created: 2025-01-03
 */

exports.up = async function(query) {
  console.log('Creating csv_imports table...');
  
  // Create csv_imports table to track import history
  await query(`
    CREATE TABLE IF NOT EXISTS csv_imports (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      total_rows INTEGER NOT NULL,
      successful_rows INTEGER NOT NULL,
      failed_rows INTEGER NOT NULL,
      skipped_rows INTEGER NOT NULL,
      import_status VARCHAR(20) NOT NULL CHECK (import_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
      column_mapping JSONB NOT NULL,
      error_log JSONB DEFAULT '[]',
      imported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP WITH TIME ZONE
    )
  `);
  
  // Create indexes for csv_imports
  await query('CREATE INDEX IF NOT EXISTS idx_csv_imports_status ON csv_imports(import_status)');
  await query('CREATE INDEX IF NOT EXISTS idx_csv_imports_imported_by ON csv_imports(imported_by)');
  await query('CREATE INDEX IF NOT EXISTS idx_csv_imports_created_at ON csv_imports(created_at)');
  
  console.log('✅ CSV imports table created successfully');
};

exports.down = async function(query) {
  console.log('Dropping csv_imports table...');
  
  // Drop indexes first
  await query('DROP INDEX IF EXISTS idx_csv_imports_status');
  await query('DROP INDEX IF EXISTS idx_csv_imports_imported_by');
  await query('DROP INDEX IF EXISTS idx_csv_imports_created_at');
  
  // Drop table
  await query('DROP TABLE IF EXISTS csv_imports CASCADE');
  
  console.log('✅ CSV imports table dropped successfully');
};
