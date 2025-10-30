require('dotenv').config();
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

async function upsertAdmin() {
  try {
    console.log('👤 Seeding admin user...');
    
    // Get admin credentials from environment
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    console.log(`   📧 Email: ${adminEmail}`);
    console.log(`   🔐 Password: ${adminPassword}`);
    console.log(`   🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Ensure admin_users table exists
    await query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        picture VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Delete any existing admin with same email to avoid unique conflicts
    await query('DELETE FROM admin_users WHERE email = $1', [adminEmail]);
    console.log('   🗑️  Removed existing admin user');

    const hashed = await bcrypt.hash(adminPassword, 10);
    const result = await query(
      `INSERT INTO admin_users (name, email, password, picture) VALUES ($1, $2, $3, $4) RETURNING *`,
      ['Admin User', adminEmail, hashed, null]
    );

    const admin = result.rows[0];
    console.log('✅ Admin created successfully');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    
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


