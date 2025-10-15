require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,  // ✅ Changed from DB_PASS to DB_PASSWORD
  port: process.env.DB_PORT,
});

async function checkDirectly() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Direct Database Check');
    console.log(`📦 Database: ${process.env.DB_NAME}`);
    console.log(`👤 User: ${process.env.DB_USER}\n`);
    
    const tables = ['users', 'religions', 'names', 'god_names', 'nicknames'];
    
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      const count = result.rows[0].count;
      console.log(`${table.padEnd(15)}: ${count} rows`);
      
      if (parseInt(count) > 0) {
        const sample = await client.query(`SELECT * FROM ${table} LIMIT 2`);
        sample.rows.forEach(row => {
          console.log(`  → ${row.name || row.email} (ID: ${row.id})`);
        });
      }
      console.log();
    }
    
    console.log('✅ Check completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDirectly();