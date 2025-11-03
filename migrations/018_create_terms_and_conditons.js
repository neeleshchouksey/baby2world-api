const { query } = require('../config/database');

module.exports = {
    up: async () => {
        console.log('Creating terms and conditions table...');
        await query(`
            CREATE TABLE IF NOT EXISTS terms_and_conditions (
                id SERIAL PRIMARY KEY,
                version VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                is_active BOOLEAN DEFAULT false NOT NULL,
                published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
                updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await query('CREATE INDEX IF NOT EXISTS idx_terms_and_conditions_is_active ON terms_and_conditions(is_active)');
        await query('CREATE INDEX IF NOT EXISTS idx_terms_and_conditions_version ON terms_and_conditions(version)');
        console.log('✅ Terms and conditions table created successfully');
    },
    down: async () => {
        console.log('Dropping terms and conditions table...');
        await query('DROP INDEX IF EXISTS idx_terms_and_conditions_version');
        await query('DROP INDEX IF EXISTS idx_terms_and_conditions_is_active');
        await query('DROP TABLE IF EXISTS terms_and_conditions CASCADE');
        console.log('✅ Terms and conditions table dropped successfully');
        },

    }