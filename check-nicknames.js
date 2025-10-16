/**
 * Script to check current nicknames data
 */

const { query } = require('./config/database');

async function checkNicknames() {
  try {
    console.log('Checking current nicknames data...');
    
    const result = await query('SELECT id, name, gender FROM nicknames LIMIT 10');
    
    console.log('Current nicknames:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}, Name: ${row.name}, Gender: ${row.gender}`);
    });
    
    // Check if we have any non-unisex nicknames
    const nonUnisex = await query("SELECT COUNT(*) as count FROM nicknames WHERE gender != 'unisex'");
    console.log(`\nNon-unisex nicknames: ${nonUnisex.rows[0].count}`);
    
  } catch (error) {
    console.error('Error checking nicknames:', error);
  }
}

checkNicknames();
