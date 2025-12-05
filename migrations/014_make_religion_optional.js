exports.up = async function(query) {
  console.log('Making religion_id optional in names table...');
  
  // First, add a default religion if none exists
  const defaultReligionCheck = await query('SELECT id FROM religions WHERE is_active = true LIMIT 1');
  if (defaultReligionCheck.rows.length === 0) {
    console.log('No active religions found, creating a default religion...');
    await query(`
      INSERT INTO religions (name, is_active, created_at, updated_at)
      VALUES ('General', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
  }
  
  // Get the first available religion ID for default
  const defaultReligion = await query('SELECT id FROM religions WHERE is_active = true LIMIT 1');
  const defaultReligionId = defaultReligion.rows[0].id;
  
  // Update existing names that have null religion_id to use default
  await query(`
    UPDATE names 
    SET religion_id = $1 
    WHERE religion_id IS NULL
  `, [defaultReligionId]);
  
  // Now make religion_id nullable
  await query(`
    ALTER TABLE names 
    ALTER COLUMN religion_id DROP NOT NULL
  `);
  
  // Add a default value for new inserts
  await query(`
    ALTER TABLE names 
    ALTER COLUMN religion_id SET DEFAULT ${defaultReligionId}
  `);
  
  console.log('✅ religion_id is now optional with default value');
};

exports.down = async function(query) {
  console.log('Making religion_id required again...');
  
  // First, ensure all names have a religion_id
  const defaultReligion = await query('SELECT id FROM religions WHERE is_active = true LIMIT 1');
  if (defaultReligion.rows.length > 0) {
    const defaultReligionId = defaultReligion.rows[0].id;
    
    // Update any null religion_id values
    await query(`
      UPDATE names 
      SET religion_id = $1 
      WHERE religion_id IS NULL
    `, [defaultReligionId]);
  }
  
  // Remove default value
  await query(`
    ALTER TABLE names 
    ALTER COLUMN religion_id DROP DEFAULT
  `);
  
  // Make religion_id NOT NULL again
  await query(`
    ALTER TABLE names 
    ALTER COLUMN religion_id SET NOT NULL
  `);
  
  console.log('✅ religion_id is now required again');
};
