require('dotenv').config();
const { query } = require('../config/database');
const User = require('../models/user.model');
const Religion = require('../models/religion.model');
const Name = require('../models/name.model');
const GodName = require('../models/godName.model');
const Nickname = require('../models/nickname.model');
const config = require('../config/environment');

async function seedSampleData() {
  try {
    console.log('📊 Seeding sample data...');
    console.log(`   🌍 Environment: ${config.environment}`);
    console.log(`   🗄️  Database: ${config.database.database}\n`);

    // Get admin user
    const adminUser = await User.findOne({ email: process.env.ADMIN_EMAIL || 'admin@example.com' });
    if (!adminUser) {
      console.log('❌ Admin user not found. Please run seed-admin.js first.');
      throw new Error('Admin user not found');
    }

    console.log('✅ Admin user found:', adminUser.email);

    // 1. Create Religions
    console.log('\n1. Creating religions...');
    const religions = [
      { name: 'Hinduism', isActive: true },
      { name: 'Islam', isActive: true },
      { name: 'Christianity', isActive: true },
      { name: 'Sikhism', isActive: true },
      { name: 'Buddhism', isActive: true }
    ];

    const createdReligions = [];
    for (const religionData of religions) {
      const religion = await Religion.create({
        ...religionData,
        createdBy: adminUser.id
      });
      createdReligions.push(religion);
      console.log(`   ✅ Created religion: ${religion.name} (ID: ${religion.id})`);
    }

    // 2. Create Names
    console.log('\n2. Creating names...');
    const names = [
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
    for (const nameData of names) {
      const name = await Name.create(nameData);
      createdNames.push(name);
      console.log(`   ✅ Created name: ${name.name} (${name.gender}) - ID: ${name.id}`);
    }

    // 3. Create God Names
    console.log('\n3. Creating god names...');
    const godNames = [
      { name: 'Krishna', description: 'Dark blue, all-attractive', religionId: createdReligions[0].id },
      { name: 'Shiva', description: 'Auspicious one', religionId: createdReligions[0].id },
      { name: 'Allah', description: 'The God', religionId: createdReligions[1].id },
      { name: 'Jesus', description: 'Savior', religionId: createdReligions[2].id },
      { name: 'Waheguru', description: 'Wonderful teacher', religionId: createdReligions[3].id },
      { name: 'Buddha', description: 'Awakened one', religionId: createdReligions[4].id }
    ];

    const createdGodNames = [];
    for (const godNameData of godNames) {
      const godName = await GodName.create({
        ...godNameData,
        createdBy: adminUser.id
      });
      createdGodNames.push(godName);
      console.log(`   ✅ Created god name: ${godName.name} - ID: ${godName.id}`);
    }

    // 4. Create Nicknames
    console.log('\n4. Creating nicknames...');
    const nicknames = [
      { name: 'Arju', description: 'Short form of Arjun' },
      { name: 'Pri', description: 'Short form of Priya' },
      { name: 'Ammu', description: 'Cute nickname' },
      { name: 'Johnny', description: 'Friendly form of John' },
      { name: 'Guru', description: 'Short form of Gurpreet' },
      { name: 'Sid', description: 'Short form of Siddharth' }
    ];

    const createdNicknames = [];
    for (const nicknameData of nicknames) {
      const nickname = await Nickname.create({
        ...nicknameData,
        createdBy: adminUser.id
      });
      createdNicknames.push(nickname);
      console.log(`   ✅ Created nickname: ${nickname.name} - ID: ${nickname.id}`);
    }

    // 5. Add some favorites for admin user
    console.log('\n5. Adding favorites for admin user...');
    if (createdNames.length >= 2) {
      await User.findByIdAndUpdate(adminUser.id, { $addToSet: { favorites: createdNames[0].id } });
      await User.findByIdAndUpdate(adminUser.id, { $addToSet: { favorites: createdNames[1].id } });
      console.log('   ✅ Added name favorites');
    }

    if (createdGodNames.length >= 2) {
      await User.findByIdAndUpdate(adminUser.id, { $addToSet: { godNameFavorites: createdGodNames[0].id } });
      await User.findByIdAndUpdate(adminUser.id, { $addToSet: { godNameFavorites: createdGodNames[1].id } });
      console.log('   ✅ Added god name favorites');
    }

    if (createdNicknames.length >= 2) {
      await User.findByIdAndUpdate(adminUser.id, { $addToSet: { nicknameFavorites: createdNicknames[0].id } });
      await User.findByIdAndUpdate(adminUser.id, { $addToSet: { nicknameFavorites: createdNicknames[1].id } });
      console.log('   ✅ Added nickname favorites');
    }

    console.log('\n🎉 Sample data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Religions: ${createdReligions.length}`);
    console.log(`   - Names: ${createdNames.length}`);
    console.log(`   - God Names: ${createdGodNames.length}`);
    console.log(`   - Nicknames: ${createdNicknames.length}`);
    console.log(`   - Admin user: ${adminUser.email}`);

  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// Export function for use in seed.js
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
