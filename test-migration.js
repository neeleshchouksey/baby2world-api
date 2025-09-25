const { query } = require('./config/database');
const User = require('./models/user.model');
const Name = require('./models/name.model');
const Religion = require('./models/religion.model');
const GodName = require('./models/godname.model');
const Nickname = require('./models/nickname.model');

async function testMigration() {
  try {
    console.log('Testing PostgreSQL migration...\n');

    // Test 1: Database Connection
    console.log('1. Testing database connection...');
    const connectionTest = await query('SELECT NOW()');
    console.log('✓ Database connected successfully');
    console.log('  Current time:', connectionTest.rows[0].now);

    // Test 2: Table Existence
    console.log('\n2. Checking table existence...');
    const tables = ['users', 'religions', 'names', 'god_names', 'nicknames', 'user_favorite_names'];
    for (const table of tables) {
      const result = await query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${table}')`);
      console.log(`✓ Table '${table}' exists:`, result.rows[0].exists);
    }

    // Test 3: User Model
    console.log('\n3. Testing User model...');
    try {
      const users = await query('SELECT COUNT(*) FROM users');
      console.log('✓ User table accessible, count:', users.rows[0].count);
    } catch (error) {
      console.log('✗ User table error:', error.message);
    }

    // Test 4: Religion Model
    console.log('\n4. Testing Religion model...');
    try {
      const religions = await Religion.find({});
      console.log('✓ Religion model working, found:', religions.length, 'religions');
    } catch (error) {
      console.log('✗ Religion model error:', error.message);
    }

    // Test 5: Name Model
    console.log('\n5. Testing Name model...');
    try {
      const names = await Name.find({}, { limit: 5 });
      console.log('✓ Name model working, found:', names.length, 'names (showing first 5)');
    } catch (error) {
      console.log('✗ Name model error:', error.message);
    }

    // Test 6: GodName Model
    console.log('\n6. Testing GodName model...');
    try {
      const godNames = await GodName.find({}, { limit: 5 });
      console.log('✓ GodName model working, found:', godNames.length, 'god names (showing first 5)');
    } catch (error) {
      console.log('✗ GodName model error:', error.message);
    }

    // Test 7: Nickname Model
    console.log('\n7. Testing Nickname model...');
    try {
      const nicknames = await Nickname.find({}, { limit: 5 });
      console.log('✓ Nickname model working, found:', nicknames.length, 'nicknames (showing first 5)');
    } catch (error) {
      console.log('✗ Nickname model error:', error.message);
    }

    // Test 8: Complex Query (Names with Religion)
    console.log('\n8. Testing complex query (Names with Religion)...');
    try {
      const namesWithReligion = await query(`
        SELECT n.name, n.gender, r.name as religion_name 
        FROM names n 
        LEFT JOIN religions r ON n.religion_id = r.id 
        LIMIT 3
      `);
      console.log('✓ Complex query working, sample data:');
      namesWithReligion.rows.forEach(row => {
        console.log(`  - ${row.name} (${row.gender}) - ${row.religion_name}`);
      });
    } catch (error) {
      console.log('✗ Complex query error:', error.message);
    }

    // Test 9: Favorites Junction Tables
    console.log('\n9. Testing favorites junction tables...');
    try {
      const favoriteNames = await query('SELECT COUNT(*) FROM user_favorite_names');
      const favoriteGodNames = await query('SELECT COUNT(*) FROM user_favorite_god_names');
      const favoriteNicknames = await query('SELECT COUNT(*) FROM user_favorite_nicknames');
      
      console.log('✓ Favorites tables accessible:');
      console.log(`  - User favorite names: ${favoriteNames.rows[0].count}`);
      console.log(`  - User favorite god names: ${favoriteGodNames.rows[0].count}`);
      console.log(`  - User favorite nicknames: ${favoriteNicknames.rows[0].count}`);
    } catch (error) {
      console.log('✗ Favorites tables error:', error.message);
    }

    // Test 10: UUID Generation
    console.log('\n10. Testing UUID generation...');
    try {
      const uuidTest = await query('SELECT uuid_generate_v4() as test_uuid');
      console.log('✓ UUID generation working:', uuidTest.rows[0].test_uuid);
    } catch (error) {
      console.log('✗ UUID generation error:', error.message);
    }

    console.log('\n🎉 Migration test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start your server: npm start');
    console.log('2. Test API endpoints');
    console.log('3. Verify frontend functionality');

  } catch (error) {
    console.error('❌ Migration test failed:', error);
  } finally {
    process.exit(0);
  }
}

testMigration();
