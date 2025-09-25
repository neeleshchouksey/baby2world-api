require('dotenv').config();
const { query } = require('../config/database');
const User = require('../models/user.model');

async function upsertAdmin() {
  try {
    console.log('Seeding admin user...');
    // Delete any existing admin with same email to avoid unique conflicts
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    await query('DELETE FROM users WHERE email = $1', [adminEmail]);

    const admin = await User.create({
      name: 'Admin User',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      googleId: null,
      picture: null,
    });

    console.log('Admin created successfully');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
  } catch (err) {
    console.error('Admin seed error:', err.message || err);
    process.exitCode = 1;
  } finally {
    process.exit(0);
  }
}

upsertAdmin();


