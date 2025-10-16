/**
 * Script to update existing nicknames with gender
 * Run this after adding gender column to nicknames table
 */

const { query } = require('./config/database');

async function updateNicknamesGender() {
  try {
    console.log('Updating existing nicknames with gender...');
    
    // Update all existing nicknames to 'unisex' by default
    await query(`
      UPDATE nicknames 
      SET gender = 'unisex' 
      WHERE gender IS NULL
    `);
    
    console.log('✅ All existing nicknames updated with gender = unisex');
    
    // You can add more specific logic here to categorize nicknames
    // based on their names if needed
    
  } catch (error) {
    console.error('Error updating nicknames gender:', error);
  }
}

// Run the update
updateNicknamesGender();
