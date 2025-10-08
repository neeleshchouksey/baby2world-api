#!/usr/bin/env node

/**
 * Professional Database Migration Runner
 * 
 * This script manages database migrations for the Baby Names application.
 * It provides functionality to run migrations up or down, track migration status,
 * and ensure database schema consistency.
 * 
 * Usage:
 *   node migrate.js up          - Run all pending migrations
 *   node migrate.js down        - Rollback the last migration
 *   node migrate.js status      - Show migration status
 *   node migrate.js reset       - Reset database and run all migrations
 *   node migrate.js seed        - Run seeders after migrations
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration from environment variables
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'babynames_db1'
};

class MigrationRunner {
  constructor() {
    this.pool = null;
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  async connect() {
    this.pool = new Pool(DB_CONFIG);
    
    // Test connection
    try {
      await this.pool.query('SELECT NOW()');
      console.log('✅ Connected to PostgreSQL database');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      console.log('✅ Database connection closed');
    }
  }

  async query(text, params = []) {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return await this.pool.query(text, params);
  }

  async ensureMigrationsTable() {
    // Create migrations table if it doesn't exist
    await this.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        batch INTEGER NOT NULL
      )
    `);
  }

  getMigrationFiles() {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }
    
    return fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();
  }

  async getExecutedMigrations() {
    const result = await this.query('SELECT filename FROM migrations ORDER BY id');
    return result.rows.map(row => row.filename);
  }

  async getNextBatchNumber() {
    const result = await this.query('SELECT MAX(batch) as max_batch FROM migrations');
    return (result.rows[0].max_batch || 0) + 1;
  }

  async runMigrationUp(filename) {
    const migrationPath = path.join(this.migrationsDir, filename);
    const migration = require(migrationPath);
    
    if (typeof migration.up !== 'function') {
      throw new Error(`Migration ${filename} does not export an 'up' function`);
    }

    console.log(`🔄 Running migration: ${filename}`);
    await migration.up(this.query.bind(this));
    
    const batch = await this.getNextBatchNumber();
    await this.query(
      'INSERT INTO migrations (filename, batch) VALUES ($1, $2)',
      [filename, batch]
    );
    
    console.log(`✅ Migration completed: ${filename}`);
  }

  async runMigrationDown(filename) {
    const migrationPath = path.join(this.migrationsDir, filename);
    const migration = require(migrationPath);
    
    if (typeof migration.down !== 'function') {
      throw new Error(`Migration ${filename} does not export a 'down' function`);
    }

    console.log(`🔄 Rolling back migration: ${filename}`);
    await migration.down(this.query.bind(this));
    
    await this.query('DELETE FROM migrations WHERE filename = $1', [filename]);
    
    console.log(`✅ Migration rolled back: ${filename}`);
  }

  async runMigrationsUp() {
    console.log('🚀 Running migrations...\n');
    
    await this.ensureMigrationsTable();
    
    const allMigrations = this.getMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();
    const pendingMigrations = allMigrations.filter(m => !executedMigrations.includes(m));
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }
    
    console.log(`Found ${pendingMigrations.length} pending migrations:`);
    pendingMigrations.forEach(m => console.log(`  - ${m}`));
    console.log('');
    
    for (const migration of pendingMigrations) {
      await this.runMigrationUp(migration);
    }
    
    console.log(`\n🎉 Successfully ran ${pendingMigrations.length} migrations`);
  }

  async runMigrationsDown() {
    console.log('🔄 Rolling back last migration...\n');
    
    await this.ensureMigrationsTable();
    
    const result = await this.query(`
      SELECT filename FROM migrations 
      ORDER BY executed_at DESC, id DESC 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('✅ No migrations to rollback');
      return;
    }
    
    const lastMigration = result.rows[0].filename;
    await this.runMigrationDown(lastMigration);
    
    console.log(`\n🎉 Successfully rolled back: ${lastMigration}`);
  }

  async showStatus() {
    console.log('📊 Migration Status\n');
    
    await this.ensureMigrationsTable();
    
    const allMigrations = this.getMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();
    
    console.log('Migration Files:');
    allMigrations.forEach(migration => {
      const status = executedMigrations.includes(migration) ? '✅ EXECUTED' : '⏳ PENDING';
      console.log(`  ${status} ${migration}`);
    });
    
    console.log(`\nTotal: ${allMigrations.length} migrations`);
    console.log(`Executed: ${executedMigrations.length}`);
    console.log(`Pending: ${allMigrations.length - executedMigrations.length}`);
  }

  async resetDatabase() {
    console.log('🗑️  Resetting database...\n');
    
    // Close current connection first
    await this.disconnect();
    
    // Drop and recreate database
    const adminPool = new Pool({
      ...DB_CONFIG,
      database: 'postgres'
    });
    
    try {
      // Terminate existing connections
      await adminPool.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `, [DB_CONFIG.database]);
      
      // Drop and recreate database
      await adminPool.query(`DROP DATABASE IF EXISTS "${DB_CONFIG.database}"`);
      await adminPool.query(`CREATE DATABASE "${DB_CONFIG.database}"`);
      
      console.log('✅ Database recreated');
    } finally {
      await adminPool.end();
    }
    
    // Wait a moment for database to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Reconnect to new database
    await this.connect();
    
    // Run all migrations
    await this.runMigrationsUp();
  }

  async runSeeders() {
    console.log('🌱 Running seeders...\n');
    
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      // Run admin seeder
      console.log('Running admin seeder...');
      await execAsync('node seeder/seed-admin.js', { cwd: __dirname });
      console.log('✅ Admin seeder completed');
      
      console.log('\n🎉 All seeders completed successfully!');
    } catch (error) {
      console.error('❌ Seeder error:', error.message);
      throw error;
    }
  }
}

async function main() {
  const command = process.argv[2];
  const runner = new MigrationRunner();
  
  try {
    await runner.connect();
    
    switch (command) {
      case 'up':
        await runner.runMigrationsUp();
        break;
        
      case 'down':
        await runner.runMigrationsDown();
        break;
        
      case 'status':
        await runner.showStatus();
        break;
        
      case 'reset':
        await runner.resetDatabase();
        break;
        
      case 'seed':
        await runner.runSeeders();
        break;
        
      case 'fresh':
        await runner.resetDatabase();
        await runner.runSeeders();
        break;
        
      default:
        console.log(`
🚀 Baby Names Database Migration Runner

Usage:
  node migrate.js up          - Run all pending migrations
  node migrate.js down        - Rollback the last migration
  node migrate.js status      - Show migration status
  node migrate.js reset       - Reset database and run all migrations
  node migrate.js seed        - Run seeders after migrations
  node migrate.js fresh       - Reset database, run migrations, and seed

Examples:
  node migrate.js fresh       - Complete fresh setup
  node migrate.js status      - Check what migrations are pending
        `);
        break;
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await runner.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = MigrationRunner;
