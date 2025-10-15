require('dotenv').config();
const { query } = require('../config/database');

async function seedSampleData() {
  try {
    console.log('📊 Seeding sample data...');
    console.log(`   🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   🗄️  Database: ${process.env.DB_NAME || 'brickvio_baby2world_db1'}\n`);

    // Get admin user
    const adminResult = await query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [process.env.ADMIN_EMAIL || 'admin@baby2world.com']
    );
    
    if (adminResult.rows.length === 0) {
      console.log('❌ Admin user not found. Please run seed-admin.js first.');
      throw new Error('Admin user not found');
    }

    const adminUser = adminResult.rows[0];
    console.log('✅ Admin user found:', adminUser.email);

    // 1. Create Religions
    console.log('\n1. Creating religions...');
    const religionNames = ['Hinduism', 'Islam', 'Christianity', 'Sikhism', 'Buddhism'];
    const createdReligions = [];

    for (const religionName of religionNames) {
      const result = await query(
        `INSERT INTO religions (name, is_active, created_by) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING *`,
        [religionName, true, adminUser.id]
      );
      createdReligions.push(result.rows[0]);
      console.log(`   ✅ Created religion: ${religionName} (ID: ${result.rows[0].id})`);
    }

    // 2. Create Names
    console.log('\n2. Creating names...');
    const namesData = [
      { name: 'Arjun', description: 'Bright, shining', religionId: createdReligions[0].id, gender: 'male' },
      { name: 'Priya', description: 'Beloved', religionId: createdReligions[0].id, gender: 'female' },
      { name: 'Ahmad', description: 'Most commendable', religionId: createdReligions[1].id, gender: 'male' },
      { name: 'Fatima', description: 'Captivating', religionId: createdReligions[1].id, gender: 'female' },
      { name: 'John', description: 'God is gracious', religionId: createdReligions[2].id, gender: 'male' },
      { name: 'Mary', description: 'Bitter', religionId: createdReligions[2].id, gender: 'female' },
      { name: 'Gurpreet', description: 'Love of the guru', religionId: createdReligions[3].id, gender: 'unisex' },
      { name: 'Siddharth', description: 'One who has accomplished a goal', religionId: createdReligions[4].id, gender: 'male' }
    ];

    const createdNames = [];
    for (const nameData of namesData) {
      const result = await query(
        `INSERT INTO names (name, description, religion_id, gender) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [nameData.name, nameData.description, nameData.religionId, nameData.gender]
      );
      createdNames.push(result.rows[0]);
      console.log(`   ✅ Created name: ${nameData.name} (${nameData.gender}) - ID: ${result.rows[0].id}`);
    }

    // 3. Create God Names
    console.log('\n3. Creating god names...');
    const godNamesData = [
      { name: 'Krishna', description: 'Dark blue, all-attractive', religionId: createdReligions[0].id },
      { name: 'Shiva', description: 'Auspicious one', religionId: createdReligions[0].id },
      { name: 'Allah', description: 'The God', religionId: createdReligions[1].id },
      { name: 'Jesus', description: 'Savior', religionId: createdReligions[2].id },
      { name: 'Waheguru', description: 'Wonderful teacher', religionId: createdReligions[3].id },
      { name: 'Buddha', description: 'Awakened one', religionId: createdReligions[4].id }
    ];

    const createdGodNames = [];
    for (const godNameData of godNamesData) {
      const result = await query(
        `INSERT INTO god_names (name, description, religion_id, created_by) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [godNameData.name, godNameData.description, godNameData.religionId, adminUser.id]
      );
      createdGodNames.push(result.rows[0]);
      console.log(`   ✅ Created god name: ${godNameData.name} - ID: ${result.rows[0].id}`);
    }

    // 4. Create Nicknames
    console.log('\n4. Creating nicknames...');
    const nicknamesData = [
      { name: 'Arju', description: 'Short form of Arjun' },
      { name: 'Pri', description: 'Short form of Priya' },
      { name: 'Ammu', description: 'Cute nickname' },
      { name: 'Johnny', description: 'Friendly form of John' },
      { name: 'Guru', description: 'Short form of Gurpreet' },
      { name: 'Sid', description: 'Short form of Siddharth' }
    ];

    const createdNicknames = [];
    for (const nicknameData of nicknamesData) {
      const result = await query(
        `INSERT INTO nicknames (name, description, created_by) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [nicknameData.name, nicknameData.description, adminUser.id]
      );
      createdNicknames.push(result.rows[0]);
      console.log(`   ✅ Created nickname: ${nicknameData.name} - ID: ${result.rows[0].id}`);
    }

    // 5. Add favorites for admin user
    console.log('\n5. Adding favorites for admin user...');
    
    if (createdNames.length >= 2) {
      await query(
        `INSERT INTO user_favorite_names (user_id, name_id) 
         VALUES ($1, $2), ($1, $3) 
         ON CONFLICT DO NOTHING`,
        [adminUser.id, createdNames[0].id, createdNames[1].id]
      );
      console.log('   ✅ Added name favorites');
    }

    if (createdGodNames.length >= 2) {
      await query(
        `INSERT INTO user_favorite_god_names (user_id, god_name_id) 
         VALUES ($1, $2), ($1, $3) 
         ON CONFLICT DO NOTHING`,
        [adminUser.id, createdGodNames[0].id, createdGodNames[1].id]
      );
      console.log('   ✅ Added god name favorites');
    }

    if (createdNicknames.length >= 2) {
      await query(
        `INSERT INTO user_favorite_nicknames (user_id, nickname_id) 
         VALUES ($1, $2), ($1, $3) 
         ON CONFLICT DO NOTHING`,
        [adminUser.id, createdNicknames[0].id, createdNicknames[1].id]
      );
      console.log('   ✅ Added nickname favorites');
    }

    console.log('\n🎉 Sample data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Religions: ${createdReligions.length}`);
    console.log(`   - Names: ${createdNames.length}`);
    console.log(`   - God Names: ${createdGodNames.length}`);
    console.log(`   - Nicknames: ${createdNicknames.length}`);
    console.log(`   - Admin user: ${adminUser.email}`);

    return true;

  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// Export function
module.exports = seedSampleData;

// Run directly if called from command line
if (require.main === module) {
  seedSampleData()
    .then(() => {
      console.log('🎉 Sample data seeder completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Sample data seeder failed:', error.message);
      process.exit(1);
    });
}