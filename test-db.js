require('dotenv').config();
const { query, closePool } = require('./config/database');

async function testDatabase() {
  try {
    console.log('🧪 Testing database connection...\n');

    // 1. Test connection
    const timeResult = await query('SELECT NOW()');
    console.log('✅ Connection successful');
    console.log(`   Server time: ${timeResult.rows[0].now}\n`);

    // 2. Check if users exist
    console.log('👤 Checking users...');
    const usersResult = await query('SELECT COUNT(*) as count, MIN(id) as first_id FROM users');
    console.log(`   Users count: ${usersResult.rows[0].count}`);
    
    let userId = usersResult.rows[0].first_id;
    
    // If no users exist, use NULL (optional foreign key)
    if (!userId) {
      console.log('   ⚠️  No users found, testing with NULL created_by\n');
      userId = null;
    } else {
      console.log(`   ✅ Using user ID: ${userId}\n`);
    }

    // 3. Test insert with proper user ID or NULL
    console.log('📝 Testing insert...');
    const insertResult = await query(
      `INSERT INTO religions (name, is_active, created_by) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (name) DO UPDATE 
       SET name = EXCLUDED.name, is_active = EXCLUDED.is_active
       RETURNING *`,
      ['Test Religion', true, userId]
    );
    console.log('✅ Insert successful');
    console.log('   ID:', insertResult.rows[0].id);
    console.log('   Name:', insertResult.rows[0].name);
    console.log('   Created by:', insertResult.rows[0].created_by);

    // 4. Test select
    console.log('\n📖 Testing select...');
    const selectResult = await query(
      'SELECT * FROM religions WHERE name = $1', 
      ['Test Religion']
    );
    console.log('✅ Select successful');
    console.log('   Found rows:', selectResult.rows.length);

    // 5. Test update
    console.log('\n✏️  Testing update...');
    const updateResult = await query(
      'UPDATE religions SET is_active = $1 WHERE name = $2 RETURNING *',
      [false, 'Test Religion']
    );
    console.log('✅ Update successful');
    console.log('   Updated rows:', updateResult.rowCount);

    // 6. Test delete
    console.log('\n🗑️  Testing delete...');
    const deleteResult = await query(
      'DELETE FROM religions WHERE name = $1 RETURNING *', 
      ['Test Religion']
    );
    console.log('✅ Delete successful');
    console.log('   Deleted rows:', deleteResult.rowCount);

    // 7. Show table counts
    console.log('\n📊 Current database status:');
    const tables = ['users', 'religions', 'names', 'god_names', 'nicknames'];
    
    for (const table of tables) {
      try {
        const countResult = await query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ${table.padEnd(15)}: ${countResult.rows[0].count} rows`);
      } catch (err) {
        console.log(`   ${table.padEnd(15)}: Table not found or error`);
      }
    }

    console.log('\n🎉 All database tests passed!');
    
  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await closePool();
  }
}

testDatabase();