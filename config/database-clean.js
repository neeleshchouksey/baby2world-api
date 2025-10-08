const { Pool } = require('pg');
require('dotenv').config();

// Database configuration from environment variables
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'babynames_db1'
};

console.log('=== CLEAN DATABASE CONFIGURATION ===');
console.log('Host:', DB_CONFIG.host);
console.log('Port:', DB_CONFIG.port);
console.log('User:', DB_CONFIG.user);
console.log('Database:', DB_CONFIG.database);
console.log('Password:', DB_CONFIG.password ? '[SET]' : '[NOT SET]');
console.log('=====================================');

function createPool(databaseName) {
  const poolConfig = {
    user: DB_CONFIG.user,
    host: DB_CONFIG.host,
    database: databaseName || DB_CONFIG.database,
    password: DB_CONFIG.password,
    port: DB_CONFIG.port,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  const pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
}

// Shared pool for the app
const pool = createPool(DB_CONFIG.database);

async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query', { text: text.split('\n')[0].slice(0, 80) + '...', duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error('DB query error', { text: text.split('\n')[0].slice(0, 120) + '...', duration, error: error.message });
    throw error;
  }
}

async function getClient() {
  return await pool.connect();
}

module.exports = {
  pool,
  query,
  getClient,
  createPool,
  config: DB_CONFIG,
};
