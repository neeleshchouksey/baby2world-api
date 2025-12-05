/**
 * Migration: 021_rename_columns_to_camelcase
 * Description: Rename all columns from snake_case to camelCase
 * IMPORTANT: This preserves all existing data and only changes column names
 * Created: 2025-01-XX
 */

exports.up = async function(query) {
  console.log('Renaming all columns from snake_case to camelCase...');
  
  const { getClient } = require('../config/database');
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // users table
    await client.query('ALTER TABLE users RENAME COLUMN google_id TO "googleId"');
    await client.query('ALTER TABLE users RENAME COLUMN is_active TO "isActive"');
    await client.query('ALTER TABLE users RENAME COLUMN created_at TO "createdAt"');
    await client.query('ALTER TABLE users RENAME COLUMN updated_at TO "updatedAt"');
    
    // religions table
    await client.query('ALTER TABLE religions RENAME COLUMN is_active TO "isActive"');
    await client.query('ALTER TABLE religions RENAME COLUMN created_by TO "createdBy"');
    await client.query('ALTER TABLE religions RENAME COLUMN updated_by TO "updatedBy"');
    await client.query('ALTER TABLE religions RENAME COLUMN created_at TO "createdAt"');
    await client.query('ALTER TABLE religions RENAME COLUMN updated_at TO "updatedAt"');
    
    // names table
    await client.query('ALTER TABLE names RENAME COLUMN religion_id TO "religionId"');
    await client.query('ALTER TABLE names RENAME COLUMN created_at TO "createdAt"');
    await client.query('ALTER TABLE names RENAME COLUMN updated_at TO "updatedAt"');
    
    // god_names table
    await client.query('ALTER TABLE god_names RENAME COLUMN religion_id TO "religionId"');
    await client.query('ALTER TABLE god_names RENAME COLUMN created_by TO "createdBy"');
    await client.query('ALTER TABLE god_names RENAME COLUMN created_at TO "createdAt"');
    await client.query('ALTER TABLE god_names RENAME COLUMN updated_at TO "updatedAt"');
    
    // god_name_sub_names table
    await client.query('ALTER TABLE god_name_sub_names RENAME COLUMN god_name_id TO "godNameId"');
    await client.query('ALTER TABLE god_name_sub_names RENAME COLUMN sub_name TO "subName"');
    await client.query('ALTER TABLE god_name_sub_names RENAME COLUMN created_at TO "createdAt"');
    
    // nicknames table
    await client.query('ALTER TABLE nicknames RENAME COLUMN created_by TO "createdBy"');
    await client.query('ALTER TABLE nicknames RENAME COLUMN updated_by TO "updatedBy"');
    await client.query('ALTER TABLE nicknames RENAME COLUMN is_active TO "isActive"');
    await client.query('ALTER TABLE nicknames RENAME COLUMN created_at TO "createdAt"');
    await client.query('ALTER TABLE nicknames RENAME COLUMN updated_at TO "updatedAt"');
    
    // user_favorite_names table
    await client.query('ALTER TABLE user_favorite_names RENAME COLUMN user_id TO "userId"');
    await client.query('ALTER TABLE user_favorite_names RENAME COLUMN name_id TO "nameId"');
    await client.query('ALTER TABLE user_favorite_names RENAME COLUMN created_at TO "createdAt"');
    
    // user_favorite_god_names table
    await client.query('ALTER TABLE user_favorite_god_names RENAME COLUMN user_id TO "userId"');
    await client.query('ALTER TABLE user_favorite_god_names RENAME COLUMN god_name_id TO "godNameId"');
    await client.query('ALTER TABLE user_favorite_god_names RENAME COLUMN created_at TO "createdAt"');
    
    // user_favorite_nicknames table
    await client.query('ALTER TABLE user_favorite_nicknames RENAME COLUMN user_id TO "userId"');
    await client.query('ALTER TABLE user_favorite_nicknames RENAME COLUMN nickname_id TO "nicknameId"');
    await client.query('ALTER TABLE user_favorite_nicknames RENAME COLUMN created_at TO "createdAt"');
    
    // sub_god_names table (renamed from subgodnames)
    const checkSubGodNames = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sub_god_names'
      )
    `);
    if (checkSubGodNames.rows[0].exists) {
      await client.query('ALTER TABLE sub_god_names RENAME COLUMN god_name_id TO "godNameId"');
      await client.query('ALTER TABLE sub_god_names RENAME COLUMN created_by TO "createdBy"');
      await client.query('ALTER TABLE sub_god_names RENAME COLUMN updated_by TO "updatedBy"');
      await client.query('ALTER TABLE sub_god_names RENAME COLUMN created_at TO "createdAt"');
      await client.query('ALTER TABLE sub_god_names RENAME COLUMN updated_at TO "updatedAt"');
    }
    
    // terms_and_conditions table
    const checkTerms = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'terms_and_conditions'
      )
    `);
    if (checkTerms.rows[0].exists) {
      await client.query('ALTER TABLE terms_and_conditions RENAME COLUMN is_active TO "isActive"');
      await client.query('ALTER TABLE terms_and_conditions RENAME COLUMN published_at TO "publishedAt"');
      await client.query('ALTER TABLE terms_and_conditions RENAME COLUMN created_by TO "createdBy"');
      await client.query('ALTER TABLE terms_and_conditions RENAME COLUMN updated_by TO "updatedBy"');
      await client.query('ALTER TABLE terms_and_conditions RENAME COLUMN created_at TO "createdAt"');
      await client.query('ALTER TABLE terms_and_conditions RENAME COLUMN updated_at TO "updatedAt"');
    }
    
    // admin_users table
    const checkAdminUsers = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_users'
      )
    `);
    if (checkAdminUsers.rows[0].exists) {
      await client.query('ALTER TABLE admin_users RENAME COLUMN created_at TO "createdAt"');
      await client.query('ALTER TABLE admin_users RENAME COLUMN updated_at TO "updatedAt"');
    }
    
    // csv_imports table
    const checkCsvImports = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'csv_imports'
      )
    `);
    if (checkCsvImports.rows[0].exists) {
      await client.query('ALTER TABLE csv_imports RENAME COLUMN total_rows TO "totalRows"');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN successful_rows TO "successfulRows"');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN failed_rows TO "failedRows"');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN skipped_rows TO "skippedRows"');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN import_status TO "importStatus"');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN column_mapping TO "columnMapping"');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN error_log TO "errorLog"');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN imported_by TO "importedBy"');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN created_at TO "createdAt"');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN completed_at TO "completedAt"');
    }
    
    // Update trigger function to use camelCase
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW."updatedAt" = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query('COMMIT');
    console.log('✅ All columns renamed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error renaming columns:', error);
    throw error;
  } finally {
    client.release();
  }
};

exports.down = async function(query) {
  console.log('Reverting all columns from camelCase to snake_case...');
  
  const { getClient } = require('../config/database');
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // users table
    await client.query('ALTER TABLE users RENAME COLUMN "googleId" TO google_id');
    await client.query('ALTER TABLE users RENAME COLUMN "isActive" TO is_active');
    await client.query('ALTER TABLE users RENAME COLUMN "createdAt" TO created_at');
    await client.query('ALTER TABLE users RENAME COLUMN "updatedAt" TO updated_at');
    
    // religions table
    await client.query('ALTER TABLE religions RENAME COLUMN "isActive" TO is_active');
    await client.query('ALTER TABLE religions RENAME COLUMN "createdBy" TO created_by');
    await client.query('ALTER TABLE religions RENAME COLUMN "updatedBy" TO updated_by');
    await client.query('ALTER TABLE religions RENAME COLUMN "createdAt" TO created_at');
    await client.query('ALTER TABLE religions RENAME COLUMN "updatedAt" TO updated_at');
    
    // names table
    await client.query('ALTER TABLE names RENAME COLUMN "religionId" TO religion_id');
    await client.query('ALTER TABLE names RENAME COLUMN "createdAt" TO created_at');
    await client.query('ALTER TABLE names RENAME COLUMN "updatedAt" TO updated_at');
    
    // god_names table
    await client.query('ALTER TABLE god_names RENAME COLUMN "religionId" TO religion_id');
    await client.query('ALTER TABLE god_names RENAME COLUMN "createdBy" TO created_by');
    await client.query('ALTER TABLE god_names RENAME COLUMN "createdAt" TO created_at');
    await client.query('ALTER TABLE god_names RENAME COLUMN "updatedAt" TO updated_at');
    
    // god_name_sub_names table
    await client.query('ALTER TABLE god_name_sub_names RENAME COLUMN "godNameId" TO god_name_id');
    await client.query('ALTER TABLE god_name_sub_names RENAME COLUMN "subName" TO sub_name');
    await client.query('ALTER TABLE god_name_sub_names RENAME COLUMN "createdAt" TO created_at');
    
    // nicknames table
    await client.query('ALTER TABLE nicknames RENAME COLUMN "createdBy" TO created_by');
    await client.query('ALTER TABLE nicknames RENAME COLUMN "updatedBy" TO updated_by');
    await client.query('ALTER TABLE nicknames RENAME COLUMN "isActive" TO is_active');
    await client.query('ALTER TABLE nicknames RENAME COLUMN "createdAt" TO created_at');
    await client.query('ALTER TABLE nicknames RENAME COLUMN "updatedAt" TO updated_at');
    
    // user_favorite_names table
    await client.query('ALTER TABLE user_favorite_names RENAME COLUMN "userId" TO user_id');
    await client.query('ALTER TABLE user_favorite_names RENAME COLUMN "nameId" TO name_id');
    await client.query('ALTER TABLE user_favorite_names RENAME COLUMN "createdAt" TO created_at');
    
    // user_favorite_god_names table
    await client.query('ALTER TABLE user_favorite_god_names RENAME COLUMN "userId" TO user_id');
    await client.query('ALTER TABLE user_favorite_god_names RENAME COLUMN "godNameId" TO god_name_id');
    await client.query('ALTER TABLE user_favorite_god_names RENAME COLUMN "createdAt" TO created_at');
    
    // user_favorite_nicknames table
    await client.query('ALTER TABLE user_favorite_nicknames RENAME COLUMN "userId" TO user_id');
    await client.query('ALTER TABLE user_favorite_nicknames RENAME COLUMN "nicknameId" TO nickname_id');
    await client.query('ALTER TABLE user_favorite_nicknames RENAME COLUMN "createdAt" TO created_at');
    
    // sub_god_names table
    const checkSubGodNames = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sub_god_names'
      )
    `);
    if (checkSubGodNames.rows[0].exists) {
      await client.query('ALTER TABLE sub_god_names RENAME COLUMN "godNameId" TO god_name_id');
      await client.query('ALTER TABLE sub_god_names RENAME COLUMN "createdBy" TO created_by');
      await client.query('ALTER TABLE sub_god_names RENAME COLUMN "updatedBy" TO updated_by');
      await client.query('ALTER TABLE sub_god_names RENAME COLUMN "createdAt" TO created_at');
      await client.query('ALTER TABLE sub_god_names RENAME COLUMN "updatedAt" TO updated_at');
    }
    
    // terms_and_conditions table
    const checkTerms = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'terms_and_conditions'
      )
    `);
    if (checkTerms.rows[0].exists) {
      await client.query('ALTER TABLE terms_and_conditions RENAME COLUMN "isActive" TO is_active');
      await client.query('ALTER TABLE terms_and_conditions RENAME COLUMN "publishedAt" TO published_at');
      await client.query('ALTER TABLE terms_and_conditions RENAME COLUMN "createdBy" TO created_by');
      await client.query('ALTER TABLE terms_and_conditions RENAME COLUMN "updatedBy" TO updated_by');
      await client.query('ALTER TABLE terms_and_conditions RENAME COLUMN "createdAt" TO created_at');
      await client.query('ALTER TABLE terms_and_conditions RENAME COLUMN "updatedAt" TO updated_at');
    }
    
    // admin_users table
    const checkAdminUsers = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_users'
      )
    `);
    if (checkAdminUsers.rows[0].exists) {
      await client.query('ALTER TABLE admin_users RENAME COLUMN "createdAt" TO created_at');
      await client.query('ALTER TABLE admin_users RENAME COLUMN "updatedAt" TO updated_at');
    }
    
    // csv_imports table
    const checkCsvImports = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'csv_imports'
      )
    `);
    if (checkCsvImports.rows[0].exists) {
      await client.query('ALTER TABLE csv_imports RENAME COLUMN "totalRows" TO total_rows');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN "successfulRows" TO successful_rows');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN "failedRows" TO failed_rows');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN "skippedRows" TO skipped_rows');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN "importStatus" TO import_status');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN "columnMapping" TO column_mapping');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN "errorLog" TO error_log');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN "importedBy" TO imported_by');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN "createdAt" TO created_at');
      await client.query('ALTER TABLE csv_imports RENAME COLUMN "completedAt" TO completed_at');
    }
    
    // Revert trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query('COMMIT');
    console.log('✅ All columns reverted successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error reverting columns:', error);
    throw error;
  } finally {
    client.release();
  }
};

