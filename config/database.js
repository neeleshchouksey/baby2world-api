const { Pool } = require('pg');
const config = require('./environment');
require('dotenv').config();

// Prefer DATABASE_URL if provided (e.g., on Render/Heroku/vercel)
const DATABASE_URL = process.env.DATABASE_URL;

// Use environment config if DATABASE_URL not set
const DB_HOST = config.database.host;
const DB_USER = config.database.user;
const DB_PASS = config.database.password;
const DB_PORT = config.database.port;
const DB_NAME = config.database.database;
const DB_SSL = config.database.ssl;

// Debug database configuration
if (config.debug) {
  console.log('🔧 Database Configuration:', {
    environment: config.environment,
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    database: DB_NAME,
    ssl: DB_SSL,
    hasPassword: !!DB_PASS
  });
}

function buildSslConfig() {
  // Use SSL configuration from environment
  return DB_SSL;
}

function createPool(databaseName) {
  const ssl = buildSslConfig();
  const poolConfig = DATABASE_URL
    ? { connectionString: DATABASE_URL, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000, ssl }
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

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
}

// Shared pool for the app
const pool = createPool(DB_NAME);

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
  config: { host: DB_HOST, user: DB_USER, password: DB_PASS ? '***' : '', port: DB_PORT, database: DB_NAME },
};