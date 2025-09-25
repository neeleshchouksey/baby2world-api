const { Pool } = require('pg');
require('dotenv').config();

// Prefer DATABASE_URL if provided (e.g., on Render/Heroku/vercel)
const DATABASE_URL = process.env.DATABASE_URL;

// Load individual params for local/dev if DATABASE_URL not set
const rawHost = process.env.PGHOST || process.env.DB_HOST || 'localhost';
const rawUser = process.env.PGUSER || process.env.DB_USER || 'postgres';
const rawPass = process.env.PGPASSWORD || process.env.DB_PASSWORD || '';
const rawPort = process.env.PGPORT || process.env.DB_PORT || process.env.DB_Port || '5432';
const rawName = process.env.PGDATABASE || process.env.DB_NAME || 'babynames_db';

const DB_HOST = String(rawHost).trim();
const DB_USER = String(rawUser).trim();
const DB_PASS = String(rawPass).trim();
const DB_PORT = parseInt(String(rawPort).trim(), 10);
const DB_NAME = String(rawName).trim();

function buildSslConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const sslEnabled = process.env.PGSSL === 'true' || process.env.PGSSLMODE === 'require' || isProduction;
  if (!sslEnabled) return undefined;
  const rejectUnauthorized = process.env.PGSSL_REJECT_UNAUTHORIZED === 'false' ? false : true;
  return { rejectUnauthorized };
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
