#!/usr/bin/env node

/**
 * Professional Server Startup Script
 * 
 * This script ensures proper environment variable loading and database connection
 * before starting the main application server.
 */

require('dotenv').config();

// Verify environment variables
console.log('🔧 Environment Configuration:');
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`  DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
console.log(`  DB_PORT: ${process.env.DB_PORT || '5432'}`);
console.log(`  DB_USER: ${process.env.DB_USER || 'postgres'}`);
console.log(`  DB_NAME: ${process.env.DB_NAME || 'babynames_db1'}`);
console.log(`  DB_PASSWORD: ${process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]'}`);
console.log('');

// Test database connection before starting server
const { query } = require('./config/database-clean');

async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    const result = await query('SELECT NOW() as current_time, current_database() as db_name');
    console.log('✅ Database connection successful!');
    console.log(`  Connected to: ${result.rows[0].db_name}`);
    console.log(`  Server time: ${result.rows[0].current_time}`);
    console.log('');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting steps:');
    console.error('  1. Make sure PostgreSQL is running');
    console.error('  2. Check your database credentials in .env file');
    console.error('  3. Ensure the database exists');
    console.error('  4. Run: node migrate.js fresh (to create database and tables)');
    console.error('');
    return false;
  }
}

async function startServer() {
  const dbConnected = await testDatabaseConnection();
  
  if (!dbConnected) {
    console.error('❌ Cannot start server without database connection');
    process.exit(1);
  }
  
  console.log('🚀 Starting application server...');
  console.log('');
  
  // Start the main application
  require('./index.js');
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
