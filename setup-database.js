require('dotenv').config();
const { query, createPool, config } = require('./config/database');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function ensureDatabaseExists() {
  const adminPool = new Pool({
    user: config.user,
    host: config.host,
    database: 'postgres',
    password: config.password,
    port: config.port,
  });

  try {
    const dbCheck = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [config.database]
    );
    if (dbCheck.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE "${config.database}"`);
      console.log(`Created database '${config.database}'.`);
    } else {
      console.log(`Database '${config.database}' already exists.`);
    }
  } finally {
    await adminPool.end();
  }
}

async function setupDatabase() {
  try {
    console.log('Setting up PostgreSQL database...');
    // Ensure DB exists before using pooled connection to it
    await ensureDatabaseExists();
    
    // Create a dedicated pool to the target database for this setup run
    // small delay to ensure catalog is updated
    await new Promise(r => setTimeout(r, 300));
    const appPool = createPool(config.database);
    const run = async (sql, params) => appPool.query(sql, params);

    // Read and execute schema file
    const schemaPath = path.join(__dirname, 'config', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Robust split for SQL statements preserving dollar-quoted blocks
    function splitSqlStatements(sql) {
      const result = [];
      let current = '';
      let inSingle = false;
      let inDouble = false;
      let inDollarTag = null;
      for (let i = 0; i < sql.length; i++) {
        const ch = sql[i];
        const next2 = sql.slice(i, i + 2);

        // Handle dollar-quoted blocks $$...$$ or $tag$...$tag$
        if (!inSingle && !inDouble) {
          if (!inDollarTag && ch === '$') {
            // detect $tag$
            const match = sql.slice(i).match(/^\$[a-zA-Z0-9_]*\$/);
            if (match) {
              inDollarTag = match[0];
              current += inDollarTag;
              i += inDollarTag.length - 1;
              continue;
            }
          } else if (inDollarTag && sql.slice(i, i + inDollarTag.length) === inDollarTag) {
            current += inDollarTag;
            i += inDollarTag.length - 1;
            inDollarTag = null;
            continue;
          }
        }

        if (!inDollarTag) {
          if (!inDouble && ch === '\'' && sql[i - 1] !== '\\') inSingle = !inSingle;
          else if (!inSingle && ch === '"' && sql[i - 1] !== '\\') inDouble = !inDouble;
          if (!inSingle && !inDouble && ch === ';') {
            result.push(current.trim());
            current = '';
            continue;
          }
        }
        current += ch;
      }
      if (current.trim()) result.push(current.trim());
      return result.filter(Boolean);
    }

    const statements = splitSqlStatements(schema);

    for (const statement of statements) {
      try {
        await run(statement);
        console.log('✓ Executed:', statement.substring(0, 60).replace(/\s+/g, ' ') + '...');
      } catch (error) {
        const msg = error.message || '';
        // Ignore common "already exists" errors during idempotent setup
        if (!/already exists|duplicate|relation .* exists/i.test(msg)) {
          console.error('Error executing statement:', msg);
          throw error;
        }
      }
    }
    
    console.log('Database setup completed successfully!');
    
    // Test the setup
    const testResult = await run('SELECT CURRENT_DATABASE() AS db, NOW() as now');
    console.log('Test query result:', testResult.rows[0]);
    
  } catch (error) {
    console.error('Database setup error:', error);
  } finally {
    process.exit(0);
  }
}

setupDatabase();
