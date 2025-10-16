/**
 * Check active status of nicknames
 */

const { query } = require('./config/database');

async function checkActiveNicknames() {
  try {
    console.log('Checking nicknames active status...');
    
    const result = await query(`
      SELECT id, name, gender, is_active 
      FROM nicknames 
      ORDER BY id
    `);
    
    console.log('All nicknames with active status:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}, Name: ${row.name}, Gender: ${row.gender}, Active: ${row.is_active}`);
    });
    
    const activeCount = result.rows.filter(row => row.is_active === true).length;
    const inactiveCount = result.rows.filter(row => row.is_active === false).length;
    
    console.log(`\nActive: ${activeCount}`);
    console.log(`Inactive: ${inactiveCount}`);
    
  } catch (error) {
    console.error('Error checking nicknames:', error);
  }
}

checkActiveNicknames();
