require('dotenv').config();
const { query } = require('../config/database');
const User = require('../models/user.model');
const config = require('../config/environment');

async function upsertAdmin() {
  try {
    console.log('👤 Seeding admin user...');
    
    // Get admin credentials from environment
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    console.log(`   📧 Email: ${adminEmail}`);
    console.log(`   🔐 Password: ${adminPassword}`);
    console.log(`   🌍 Environment: ${config.environment}`);

    // Delete any existing admin with same email to avoid unique conflicts
    await query('DELETE FROM users WHERE email = $1', [adminEmail]);
    console.log('   🗑️  Removed existing admin user');

    const admin = await User.create({
      name: 'Admin User',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      googleId: null,
      picture: null,
    });

    console.log('✅ Admin created successfully');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    
    return admin;
  } catch (err) {
    console.error('❌ Admin seed error:', err.message || err);
    throw err;
  }
}

// Export function for use in seed.js
module.exports = upsertAdmin;

// Run directly if called from command line
if (require.main === module) {
  upsertAdmin()
    .then(() => {
      console.log('🎉 Admin seeder completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Admin seeder failed:', error.message);
      process.exit(1);
    });
}


