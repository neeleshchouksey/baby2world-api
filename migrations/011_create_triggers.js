/**
 * Migration: 011_create_triggers
 * Description: Create triggers for automatic timestamp updates
 * Created: 2025-01-03
 */

exports.up = async function(query) {
  console.log('Creating triggers for automatic timestamp updates...');
  
  // Create function to update updated_at timestamp
  await query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  // Create triggers for updated_at (using PROCEDURE for older PostgreSQL)
  await query(`
    CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  `);
  
  await query(`
    CREATE TRIGGER update_religions_updated_at 
    BEFORE UPDATE ON religions 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  `);
  
  await query(`
    CREATE TRIGGER update_names_updated_at 
    BEFORE UPDATE ON names 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  `);
  
  await query(`
    CREATE TRIGGER update_god_names_updated_at 
    BEFORE UPDATE ON god_names 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  `);
  
  await query(`
    CREATE TRIGGER update_nicknames_updated_at 
    BEFORE UPDATE ON nicknames 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  `);
  
  console.log('✅ Triggers created successfully');
};

exports.down = async function(query) {
  console.log('Dropping triggers...');
  
  // Drop triggers
  await query('DROP TRIGGER IF EXISTS update_users_updated_at ON users');
  await query('DROP TRIGGER IF EXISTS update_religions_updated_at ON religions');
  await query('DROP TRIGGER IF EXISTS update_names_updated_at ON names');
  await query('DROP TRIGGER IF EXISTS update_god_names_updated_at ON god_names');
  await query('DROP TRIGGER IF EXISTS update_nicknames_updated_at ON nicknames');
  
  // Drop function
  await query('DROP FUNCTION IF EXISTS update_updated_at_column()');
  
  console.log('✅ Triggers dropped successfully');
};