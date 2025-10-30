#!/usr/bin/env node

/**
 * Centralized Seeder Runner
 * Handles all database seeding operations
 */

require('dotenv').config();
const { query } = require('./config/database');

console.log('🌱 Baby Names Database Seeder');
console.log('================================');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Database: ${process.env.DB_NAME || 'brickvio_baby2world_db1'}`);
console.log('================================\n');

// Import seeders
const seedAdmin = require('./seeder/seed-admin');
const seedSampleData = require('./seeder/seed-sample-data');

class SeederRunner {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      // Test database connection
      await query('SELECT NOW()');
      console.log('✅ Database connected successfully\n');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔌 Database connection closed');
    }
  }

  async runAdminSeeder() {
    console.log('👤 Running Admin Seeder...');
    try {
      await seedAdmin();
      console.log('✅ Admin seeder completed\n');
    } catch (error) {
      console.error('❌ Admin seeder failed:', error.message);
      throw error;
    }
  }

  async runSampleDataSeeder() {
    console.log('📊 Running Sample Data Seeder...');
    try {
      await seedSampleData();
      console.log('✅ Sample data seeder completed\n');
    } catch (error) {
      console.error('❌ Sample data seeder failed:', error.message);
      throw error;
    }
  }

  async runAllSeeders() {
    console.log('🚀 Running All Seeders...\n');
    
    try {
      // 1. Run admin seeder first
      await this.runAdminSeeder();
      
      // 2. Run sample data seeder
      await this.runSampleDataSeeder();
      
      console.log('🎉 All seeders completed successfully!');
    } catch (error) {
      console.error('❌ Seeding failed:', error.message);
      throw error;
    }
  }

  async showSeederStatus() {
    console.log('📋 Seeder Status Check...\n');
    
    try {
      // Check admin user
      const adminCount = await query('SELECT COUNT(*) FROM users WHERE role = $1', ['admin']);
      console.log(`👤 Admin users: ${adminCount.rows[0].count}`);
      
      // Check religions
      const religionCount = await query('SELECT COUNT(*) FROM religions');
      console.log(`🕉️  Religions: ${religionCount.rows[0].count}`);
      
      // Check names
      const nameCount = await query('SELECT COUNT(*) FROM names');
      console.log(`📝 Names: ${nameCount.rows[0].count}`);
      
      // Check god names
      const godNameCount = await query('SELECT COUNT(*) FROM god_names');
      console.log(`🙏 God Names: ${godNameCount.rows[0].count}`);
      
      // Check nicknames
      const nicknameCount = await query('SELECT COUNT(*) FROM nicknames');
      console.log(`😊 Nicknames: ${nicknameCount.rows[0].count}`);
      
      console.log('\n✅ Status check completed');
    } catch (error) {
      console.error('❌ Status check failed:', error.message);
      throw error;
    }
  }
}

async function main() {
  const command = process.argv[2];
  const runner = new SeederRunner();
  
  try {
    await runner.connect();
    
    switch (command) {
      case 'admin':
        await runner.runAdminSeeder();
        break;
        
      case 'sample':
        await runner.runSampleDataSeeder();
        break;
        
      case 'all':
        await runner.runAllSeeders();
        break;
        
      case 'status':
        await runner.showSeederStatus();
        break;
        
      default:
        console.log(`
🌱 Baby Names Database Seeder

Usage:
  node seed.js admin        - Run admin seeder only
  node seed.js sample       - Run sample data seeder only
  node seed.js all          - Run all seeders
  node seed.js status       - Show seeder status

Examples:
  node seed.js all          - Complete seeding
  node seed.js status       - Check what data exists
  node seed.js admin        - Create admin user only

Environment: ${process.env.NODE_ENV || 'development'}
Database: ${process.env.DB_NAME || 'babynames_db1'}
        `);
        break;
    }
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await runner.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = SeederRunner;
