const { Pool } = require('pg');
require('dotenv').config();

// Database configuration from environment variables (same as migration)
const DATABASE_URL = process.env.DATABASE_URL;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASSWORD || '';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_NAME = process.env.DB_NAME || 'brickvio_baby2world_db1';
const DB_SSL = process.env.DB_SSL === 'true' ? {
  rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
} : false;

// Debug database configuration
if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 Database Configuration:', {
    environment: process.env.NODE_ENV || 'development',
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    database: DB_NAME,
    ssl: DB_SSL,
    hasPassword: !!DB_PASS
  });
}

function buildSslConfig() {
  return DB_SSL;
}

function createPool(databaseName) {
  const ssl = buildSslConfig();
  const poolConfig = DATABASE_URL
    ? { 
        connectionString: DATABASE_URL, 
        max: 20, 
        idleTimeoutMillis: 30000, 
        connectionTimeoutMillis: 5000, 
        ssl 
      }
    : {
        user: DB_USER,
        host: DB_HOST,
        database: databaseName || DB_NAME,
        password: DB_PASS || undefined,
        port: DB_PORT,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl,
      };

  const pool = new Pool(poolConfig);

  pool.on('connect', (client) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ New database connection established');
    }
  });

  pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
  });

  return pool;
}

const pool = createPool(DB_NAME);

// 🆕 Query function with EXPLICIT COMMIT
async function query(text, params) {
  const start = Date.now();
  const client = await pool.connect(); // Get dedicated client
  
  try {
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query', { 
        text: text.split('\n')[0].slice(0, 80) + '...', 
        duration, 
        rows: res.rowCount 
      });
    }
    
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error('DB query error', { 
      text: text.split('\n')[0].slice(0, 120) + '...', 
      duration, 
      error: error.message 
    });
    throw error;
  } finally {
    client.release(); // Release client back to pool
  }
}

async function getClient() {
  return await pool.connect();
}

// 🆕 Close pool with proper cleanup
let isClosing = false;
async function closePool() {
  if (isClosing) {
    console.log('⏳ Pool already closing...');
    return;
  }
  
  isClosing = true;
  
  try {
    await pool.end();
    console.log('🔌 Database pool closed successfully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error.message);
    throw error;
  }
}

// 🆕 Transaction helpers
async function beginTransaction(client) {
  await client.query('BEGIN');
}

async function commitTransaction(client) {
  await client.query('COMMIT');
}

async function rollbackTransaction(client) {
  await client.query('ROLLBACK');
}

// 🆕 Execute queries in a transaction
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await beginTransaction(client);
    const result = await callback(client);
    await commitTransaction(client);
    return result;
  } catch (error) {
    await rollbackTransaction(client);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  getClient,
  createPool,
  closePool,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  withTransaction,
  config: { 
    host: DB_HOST, 
    user: DB_USER, 
    password: DB_PASS ? '***' : '', 
    port: DB_PORT, 
    database: DB_NAME 
  },
};