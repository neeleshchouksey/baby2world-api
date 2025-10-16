/**
 * Script to update some nicknames with different genders for testing
 */

const { query } = require('./config/database');

async function updateSomeNicknames() {
  try {
    console.log('Updating some nicknames with different genders...');
    
    // Update some nicknames to male
    await query(`
      UPDATE nicknames 
      SET gender = 'male' 
      WHERE name IN ('Johnny', 'Sid', 'Guru', 'gattu')
    `);
    
    // Update some nicknames to female  
    await query(`
      UPDATE nicknames 
      SET gender = 'female' 
      WHERE name IN ('Ammu', 'Pri', 'golu')
    `);
    
    // Keep Arju as unisex
    
    console.log('✅ Updated nicknames with different genders');
    
    // Check the results
    const result = await query('SELECT id, name, gender FROM nicknames ORDER BY id');
    
    console.log('\nUpdated nicknames:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}, Name: ${row.name}, Gender: ${row.gender}`);
    });
    
  } catch (error) {
    console.error('Error updating nicknames:', error);
  }
}

updateSomeNicknames();
