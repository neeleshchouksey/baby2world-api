const { query } = require('../config/database');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Religion = require('../models/religion.model');
const Origin = require('../models/origin.model');

/**
 * CSV Import Controller
 * Handles flexible CSV import with column mapping
 */

// Step 1: Upload CSV and get preview
exports.uploadCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file uploaded'
      });
    }

    const filePath = req.file.path;
    const results = [];
    const headers = [];

    // Parse CSV to get headers and first few rows
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers.push(...headerList);
        })
        .on('data', (data) => {
          results.push(data); // Get all rows, not just first 10
        })
        .on('end', () => {
          // For large datasets, don't send all data in response
          if (results.length > 1000) {
            console.log(`Large dataset detected: ${results.length} rows. Keeping file for processing.`);
            // Store the file for chunked processing instead of deleting it
            resolve(res.json({
              success: true,
              data: {
                headers,
                preview: results.slice(0, 10), // Show only first 10 for preview
                totalRows: results.length,
                isLargeDataset: true,
                filePath: filePath // Keep file for chunked processing
              }
            }));
          } else {
            console.log(`Small dataset detected: ${results.length} rows. Processing in memory.`);
            // Clean up file for small datasets
            fs.unlinkSync(filePath);
            resolve(res.json({
              success: true,
              data: {
                headers,
                preview: results.slice(0, 10), // Show only first 10 for preview
                totalRows: results.length,
                allData: results // Store all data for processing
              }
            }));
          }
        })
        .on('error', (error) => {
          fs.unlinkSync(filePath);
          reject(res.status(500).json({
            success: false,
            error: 'Error parsing CSV file'
          }));
        });
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Error processing CSV file'
    });
  }
};

// Step 2: Get available database fields for mapping
exports.getMappingFields = async (req, res) => {
  try {
    // Get available religions and origins for mapping
    const religionsResult = await query('SELECT id, name FROM religions WHERE "isActive" = true ORDER BY name');
    const originsResult = await query('SELECT id, name FROM origins WHERE "isActive" = true ORDER BY name');
    
    const mappingFields = {
      required: [
        { field: 'name', label: 'Name', type: 'text', required: true },
        { field: 'gender', label: 'Gender', type: 'select', required: true, options: ['male', 'female', 'unisex'] }
      ],
      optional: [
        { field: 'description', label: 'Description', type: 'text', required: false },
        { field: 'religionId', label: 'Religion', type: 'select', required: false, options: religionsResult.rows },
        { field: 'originId', label: 'Origin', type: 'select', required: false, options: originsResult.rows }
      ]
    };

    res.json({
      success: true,
      data: mappingFields
    });

  } catch (error) {
    console.error('Error getting mapping fields:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting mapping fields'
    });
  }
};

// Step 3: Process CSV import with column mapping
exports.processImport = async (req, res) => {
  let importId = null; // Declare importId at function scope
  
  try {
    console.log('CSV Import - Received request:', {
      csvDataLength: req.body.csvData?.length,
      columnMapping: req.body.columnMapping,
      importOptions: req.body.importOptions,
      userId: req.user?.id
    });
    
    const { csvData, columnMapping, importOptions, filePath } = req.body;
    let userId = req.user?.id;

    // Validate user exists in database if userId is provided
    if (userId) {
      try {
        const userCheck = await query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
          console.log(`CSV Import - User ID ${userId} not found in database, setting importedBy to NULL`);
          userId = null;
        }
      } catch (userCheckError) {
        console.error('CSV Import - Error checking user:', userCheckError);
        userId = null; // Set to null if check fails
      }
    }

    if (!columnMapping) {
      console.log('CSV Import - Missing required data');
      return res.status(400).json({
        success: false,
        error: 'Column mapping is required'
      });
    }
    
    // Handle large datasets by reading from file
    let csvDataToProcess = csvData;
    if (filePath && !csvData) {
      console.log('Processing large dataset from file:', filePath);
      try {
        csvDataToProcess = await readCSVFromFile(filePath);
        console.log(`Successfully read ${csvDataToProcess.length} rows from file`);
      } catch (fileError) {
        console.error('Error reading CSV file:', fileError);
        return res.status(500).json({
          success: false,
          error: 'Error reading CSV file from server'
        });
      }
    }
    
    if (!csvDataToProcess || csvDataToProcess.length === 0) {
      console.log('CSV Import - No data to process');
      return res.status(400).json({
        success: false,
        error: 'No CSV data to process'
      });
    }

    // Log first row structure for debugging
    if (csvDataToProcess.length > 0) {
      console.log('CSV Import - First row structure:', csvDataToProcess[0]);
      console.log('CSV Import - First row keys:', Object.keys(csvDataToProcess[0]));
    }

    // Validate required mappings
    if (!columnMapping.name) {
      console.log('CSV Import - Name mapping is required');
      return res.status(400).json({
        success: false,
        error: 'Name mapping is required'
      });
    }
    
    // Log column mapping for debugging
    console.log('CSV Import - Column mapping received:', JSON.stringify(columnMapping, null, 2));
    console.log('CSV Import - Import options received:', JSON.stringify(importOptions, null, 2));
    
    if (!columnMapping.gender && !importOptions.autoDetectGender) {
      console.log('CSV Import - Gender mapping is required');
      return res.status(400).json({
        success: false,
        error: 'Gender mapping is required or enable auto-detection'
      });
    }
    
    // Religion is now optional - no validation needed

    // Create import record
    const importRecord = await query(`
      INSERT INTO csv_imports (filename, "totalRows", "successfulRows", "failedRows", "skippedRows", "importStatus", "columnMapping", "importedBy")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      filePath || 'in-memory-upload',
      csvDataToProcess.length,
      0,
      0,
      0,
      'processing',
      JSON.stringify(columnMapping),
      userId
    ]);

    const importId = importRecord.rows[0].id;

    // Process each row in batches to handle large datasets
    const results = {
      successful: [],
      failed: [],
      skipped: []
    };

    console.log('CSV Import - Processing', csvDataToProcess.length, 'rows in batches');
    console.log('CSV Import - Import options received:', importOptions);
    
    // Process in batches of 500 for better performance
    const batchSize = 500;
    const totalBatches = Math.ceil(csvDataToProcess.length / batchSize);
    
    // Pre-fetch all existing names for faster duplicate checking
    console.log('Pre-fetching existing names for duplicate checking...');
    const existingNamesResult = await query('SELECT LOWER(name) as name FROM names');
    const existingNames = new Set(existingNamesResult.rows.map(row => row.name));
    console.log(`Found ${existingNames.size} existing names in database`);
    
    // Pre-fetch all existing religions for faster lookup (including inactive ones)
    console.log('Pre-fetching existing religions...');
    const existingReligionsResult = await query('SELECT id, LOWER(name) as name_lower, "isActive" FROM religions');
    const existingReligions = new Map();
    const inactiveReligions = new Map(); // Track inactive religions to reactivate them
    existingReligionsResult.rows.forEach(row => {
      existingReligions.set(row.name_lower, row.id);
      if (!row.isActive) {
        inactiveReligions.set(row.name_lower, row.id);
      }
    });
    console.log(`Found ${existingReligions.size} existing religions in database (${inactiveReligions.size} inactive):`, Array.from(existingReligions.keys()));
    
    // Track newly created religions
    const newlyCreatedReligions = new Map();
    
    // Pre-fetch all existing origins for faster lookup (including inactive ones)
    console.log('Pre-fetching existing origins...');
    const existingOriginsResult = await query('SELECT id, LOWER(name) as name_lower, "isActive" FROM origins');
    const existingOrigins = new Map();
    const inactiveOrigins = new Map(); // Track inactive origins to reactivate them
    existingOriginsResult.rows.forEach(row => {
      existingOrigins.set(row.name_lower, row.id);
      if (!row.isActive) {
        inactiveOrigins.set(row.name_lower, row.id);
      }
    });
    console.log(`Found ${existingOrigins.size} existing origins in database (${inactiveOrigins.size} inactive):`, Array.from(existingOrigins.keys()));
    
    // Track newly created origins
    const newlyCreatedOrigins = new Map();
    
    // Get default religion ID for names without religion
    let defaultReligionId = null;
    try {
      const defaultReligionResult = await query(
        'SELECT id FROM religions WHERE "isActive" = true ORDER BY id ASC LIMIT 1'
      );
      if (defaultReligionResult.rows.length > 0) {
        defaultReligionId = defaultReligionResult.rows[0].id;
        console.log(`Default religion ID: ${defaultReligionId}`);
      } else {
        console.log('Warning: No active religion found, names without religion will have null religionId');
      }
    } catch (religionError) {
      console.error('Error fetching default religion:', religionError);
    }
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, csvDataToProcess.length);
      const batch = csvDataToProcess.slice(startIndex, endIndex);
      
      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (rows ${startIndex + 1}-${endIndex})`);
      
      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        const rowNumber = startIndex + i + 1;
      
      console.log(`CSV Import - Processing row ${rowNumber}:`, row);
      console.log(`CSV Import - Column mapping for row ${rowNumber}:`, columnMapping);
      console.log(`CSV Import - Available row keys:`, Object.keys(row));

      try {
        // Helper function to get value from row with case-insensitive matching
        const getRowValue = (columnName) => {
          if (!columnName || columnName.trim() === '') return null;
          
          // Try exact match first
          if (row[columnName] !== undefined) {
            return row[columnName];
          }
          
          // Try case-insensitive match
          const rowKeys = Object.keys(row);
          const matchedKey = rowKeys.find(key => key.toLowerCase() === columnName.toLowerCase());
          if (matchedKey) {
            return row[matchedKey];
          }
          
          return null;
        };
        
        // Extract data based on mapping - handle empty strings and undefined values
        const nameValue = getRowValue(columnMapping.name);
        const name = nameValue ? String(nameValue).trim() : '';
        
        if (!name) {
          console.log(`Row ${rowNumber}: Name is empty or not found. Column mapping: "${columnMapping.name}", Available keys:`, Object.keys(row));
        }
        
        let genderValue = '';
        if (columnMapping.gender === 'auto') {
          genderValue = 'unisex';
        } else if (columnMapping.gender && columnMapping.gender.trim() !== '') {
          const genderRaw = getRowValue(columnMapping.gender);
          genderValue = genderRaw ? String(genderRaw).trim() : '';
        }
        
        const descriptionValue = columnMapping.description && columnMapping.description.trim() !== '' 
          ? (getRowValue(columnMapping.description) ? String(getRowValue(columnMapping.description)).trim() : '')
          : '';
        
        // Extract religion - check both religionId and religion_id mappings
        // Frontend uses religion_id key which contains the actual CSV column name (e.g., "Religion")
        let religionIdValue = null;
        const religionColumnName = columnMapping.religionId || columnMapping.religion_id;
        
        if (religionColumnName && religionColumnName.trim() !== '') {
          religionIdValue = getRowValue(religionColumnName);
          console.log(`Row ${rowNumber}: Religion column mapped: "${religionColumnName}", extracted value: "${religionIdValue}"`);
          
          // If value is empty string, set to null
          if (religionIdValue !== null && String(religionIdValue).trim() === '') {
            religionIdValue = null;
            console.log(`Row ${rowNumber}: Religion value is empty, setting to null`);
          }
        } else {
          console.log(`Row ${rowNumber}: No religion column mapped`);
        }
        
        // Extract origin - check both originId and origin_id mappings
        let originIdValue = null;
        const originColumnName = columnMapping.originId || columnMapping.origin_id;
        
        if (originColumnName && originColumnName.trim() !== '') {
          originIdValue = getRowValue(originColumnName);
          console.log(`Row ${rowNumber}: Origin column mapped: "${originColumnName}", extracted value: "${originIdValue}"`);
          
          // If value is empty string, set to null
          if (originIdValue !== null && String(originIdValue).trim() === '') {
            originIdValue = null;
            console.log(`Row ${rowNumber}: Origin value is empty, setting to null`);
          }
        } else {
          console.log(`Row ${rowNumber}: No origin column mapped`);
        }
        
        const nameData = {
          name: name,
          gender: genderValue,
          description: descriptionValue,
          religionId: religionIdValue,
          originId: originIdValue
        };
        
        console.log(`CSV Import - Extracted data for row ${rowNumber}:`, nameData);
        console.log(`CSV Import - Column mapping:`, JSON.stringify(columnMapping, null, 2));

        // Validate required fields
        if (!nameData.name) {
          console.log(`Row ${rowNumber}: Name is empty, skipping`);
          results.failed.push({
            row: rowNumber,
            name: nameData.name,
            error: 'Name is required'
          });
          continue;
        }
        
        console.log(`Row ${rowNumber}: Processing name "${nameData.name}"`);

        // Handle gender mapping with flexible matching
        if (columnMapping.gender === 'auto' || (importOptions.autoDetectGender && (!columnMapping.gender || columnMapping.gender.trim() === ''))) {
          // Auto-detect gender based on name patterns or use unisex
          const detectedGender = detectGender(nameData.name);
          nameData.gender = detectedGender;
          console.log(`Row ${rowNumber}: Auto-detected gender for "${nameData.name}": ${detectedGender}`);
        } else if (nameData.gender && nameData.gender.trim() !== '') {
          // Normalize gender input (case-insensitive, flexible matching)
          const normalizedGender = normalizeGender(nameData.gender);
          nameData.gender = normalizedGender;
          console.log(`Row ${rowNumber}: Using mapped gender for "${nameData.name}": ${normalizedGender} (from "${nameData.gender}")`);
        } else {
          // If no gender provided and auto-detect is not enabled, default to unisex
          nameData.gender = 'unisex';
          console.log(`Row ${rowNumber}: No gender provided, defaulting to unisex for "${nameData.name}"`);
        }

        // Handle religion mapping - simple logic: CSV se jo religion hai wahi use karo
        const religionValue = nameData.religionId;
        console.log(`Row ${rowNumber}: Religion value from CSV: "${religionValue}" (type: ${typeof religionValue})`);
        
        if (religionValue && String(religionValue).trim() !== '') {
          const trimmedReligion = String(religionValue).trim();
          
          // If it's a number, use it as religion ID
          if (!isNaN(trimmedReligion) && trimmedReligion !== '' && !isNaN(parseInt(trimmedReligion))) {
            const religionIdInt = parseInt(trimmedReligion);
            // Verify religion exists
            const verifyReligion = await query('SELECT id FROM religions WHERE id = $1 AND "isActive" = true', [religionIdInt]);
            if (verifyReligion.rows.length > 0) {
              nameData.religionId = religionIdInt;
              console.log(`Row ${rowNumber}: Using religion ID from CSV: ${nameData.religionId}`);
            } else {
              console.log(`Row ${rowNumber}: Religion ID ${religionIdInt} not found in database, setting to null`);
              nameData.religionId = null;
            }
          } else {
            // If it's a string (religion name), find exact match in database
            const religionLower = trimmedReligion.toLowerCase();
            console.log(`Row ${rowNumber}: Looking for religion by name: "${trimmedReligion}" (lowercase: "${religionLower}")`);
            
            // Check in pre-fetched religions first (active ones)
            if (existingReligions.has(religionLower)) {
              const religionId = existingReligions.get(religionLower);
              // Check if it's inactive, if so reactivate it
              if (inactiveReligions.has(religionLower)) {
                await query('UPDATE religions SET "isActive" = true WHERE id = $1', [religionId]);
                inactiveReligions.delete(religionLower);
                console.log(`Row ${rowNumber}: Reactivated inactive religion: "${trimmedReligion}" (ID: ${religionId})`);
              }
              nameData.religionId = religionId;
              console.log(`Row ${rowNumber}: Religion found in pre-fetched list: "${trimmedReligion}" (ID: ${nameData.religionId})`);
            } else if (newlyCreatedReligions.has(religionLower)) {
              nameData.religionId = newlyCreatedReligions.get(religionLower);
              console.log(`Row ${rowNumber}: Religion found in newly created list: "${trimmedReligion}" (ID: ${nameData.religionId})`);
            } else {
              // Not in cache, check database (check both active and inactive)
              const religionResult = await query(
                'SELECT id, name, "isActive" FROM religions WHERE LOWER(name) = LOWER($1)',
                [trimmedReligion]
              );
              
              if (religionResult.rows.length > 0) {
                // Found in database
                const religion = religionResult.rows[0];
                nameData.religionId = religion.id;
                
                // If inactive, reactivate it
                if (!religion.isActive) {
                  await query('UPDATE religions SET "isActive" = true WHERE id = $1', [religion.id]);
                  console.log(`Row ${rowNumber}: Reactivated inactive religion: "${religion.name}" (ID: ${religion.id})`);
                }
                
                // Add to cache
                existingReligions.set(religionLower, nameData.religionId);
                console.log(`Row ${rowNumber}: Religion found in database: "${religion.name}" (ID: ${nameData.religionId})`);
              } else {
                // Not found, create new religion
                try {
                  console.log(`Row ${rowNumber}: Religion "${trimmedReligion}" not found, creating new religion...`);
                
                if (!trimmedReligion || trimmedReligion.length === 0) {
                  throw new Error('Religion name cannot be empty');
                }
                
                if (trimmedReligion.length > 50) {
                  throw new Error('Religion name cannot exceed 50 characters');
                }
                
                // Try to create religion directly with SQL to avoid model issues
                // First check if it exists (including inactive)
                const checkAgain = await query(
                  'SELECT id, name, "isActive" FROM religions WHERE LOWER(name) = LOWER($1)',
                  [trimmedReligion]
                );
                
                if (checkAgain.rows.length > 0) {
                  const religion = checkAgain.rows[0];
                  nameData.religionId = religion.id;
                  
                  // If inactive, reactivate it
                  if (!religion.isActive) {
                    await query('UPDATE religions SET "isActive" = true WHERE id = $1', [religion.id]);
                    console.log(`Row ${rowNumber}: Reactivated inactive religion: "${religion.name}" (ID: ${religion.id})`);
                  }
                  
                  // Add to cache
                  existingReligions.set(religionLower, nameData.religionId);
                  console.log(`Row ${rowNumber}: Religion found after recheck: "${religion.name}" (ID: ${nameData.religionId})`);
                } else {
                  const createResult = await query(
                    'INSERT INTO religions (name, "createdBy", "isActive") VALUES ($1, $2, $3) RETURNING id, name',
                    [trimmedReligion, null, true]
                  );
                  
                  nameData.religionId = createResult.rows[0].id;
                  // Add to both caches
                  existingReligions.set(religionLower, nameData.religionId);
                  newlyCreatedReligions.set(religionLower, nameData.religionId);
                  console.log(`Row ${rowNumber}: ✅ Created new religion "${createResult.rows[0].name}" (ID: ${nameData.religionId})`);
                }
              } catch (createError) {
                console.error(`Row ${rowNumber}: Error creating religion "${trimmedReligion}":`, createError);
                console.error(`Row ${rowNumber}: Error details:`, {
                  message: createError.message,
                  code: createError.code,
                  detail: createError.detail,
                  constraint: createError.constraint
                });
                
                // If duplicate error (unique constraint violation), try to find it again (including inactive)
                if (createError.code === '23505' || createError.constraint === 'religions_name_key' || createError.message.includes('duplicate') || createError.message.includes('unique')) {
                  console.log(`Row ${rowNumber}: Duplicate religion detected, finding existing religion...`);
                  try {
                    const duplicateCheck = await query(
                      'SELECT id, name, "isActive" FROM religions WHERE LOWER(name) = LOWER($1)',
                      [trimmedReligion]
                    );
                    if (duplicateCheck.rows.length > 0) {
                      const religion = duplicateCheck.rows[0];
                      nameData.religionId = religion.id;
                      
                      // If inactive, reactivate it
                      if (!religion.isActive) {
                        await query('UPDATE religions SET "isActive" = true WHERE id = $1', [religion.id]);
                        console.log(`Row ${rowNumber}: Reactivated inactive duplicate religion: "${religion.name}" (ID: ${religion.id})`);
                      }
                      
                      // Add to cache
                      existingReligions.set(religionLower, nameData.religionId);
                      console.log(`Row ${rowNumber}: Found duplicate religion: "${religion.name}" (ID: ${nameData.religionId})`);
                    } else {
                      throw createError; // Re-throw if still not found
                    }
                  } catch (findError) {
                    console.error(`Row ${rowNumber}: Could not find duplicate religion:`, findError);
                    // If still can't find, set to null (no default religion)
                    nameData.religionId = null;
                    console.log(`Row ${rowNumber}: Could not find or create religion, setting to null`);
                  }
                } else {
                  // For other errors, set to null (no default religion)
                  nameData.religionId = null;
                  console.log(`Row ${rowNumber}: Religion creation failed, setting to null`);
                }
              }
              }
            }
          }
        } else {
          // If no religion provided in CSV, set to null (no default religion)
          nameData.religionId = null;
          console.log(`Row ${rowNumber}: No religion provided in CSV, setting to null`);
        }
        
        console.log(`Row ${rowNumber}: Final religionId: ${nameData.religionId}`);
                // ========== ORIGIN HANDLING - START ==========
        // Handle origin mapping - similar to religion logic
        const originValue = nameData.originId;
        console.log(`Row ${rowNumber}: Origin value from CSV: "${originValue}" (type: ${typeof originValue})`);

        if (originValue && String(originValue).trim() !== '') {
          const trimmedOrigin = String(originValue).trim();
          
          // If it's a number, use it as origin ID
          if (!isNaN(trimmedOrigin) && trimmedOrigin !== '' && !isNaN(parseInt(trimmedOrigin))) {
            const originIdInt = parseInt(trimmedOrigin);
            // Verify origin exists
            const verifyOrigin = await query('SELECT id FROM origins WHERE id = $1 AND "isActive" = true', [originIdInt]);
            if (verifyOrigin.rows.length > 0) {
              nameData.originId = originIdInt;
              console.log(`Row ${rowNumber}: Using origin ID from CSV: ${nameData.originId}`);
            } else {
              console.log(`Row ${rowNumber}: Origin ID ${originIdInt} not found in database, setting to null`);
              nameData.originId = null;
            }
          } else {
            // If it's a string (origin name), find exact match in database
            const originLower = trimmedOrigin.toLowerCase();
            console.log(`Row ${rowNumber}: Looking for origin by name: "${trimmedOrigin}" (lowercase: "${originLower}")`);
            
            // Check in pre-fetched origins first (active ones)
            if (existingOrigins.has(originLower)) {
              const originId = existingOrigins.get(originLower);
              // Check if it's inactive, if so reactivate it
              if (inactiveOrigins.has(originLower)) {
                await query('UPDATE origins SET "isActive" = true WHERE id = $1', [originId]);
                inactiveOrigins.delete(originLower);
                console.log(`Row ${rowNumber}: Reactivated inactive origin: "${trimmedOrigin}" (ID: ${originId})`);
              }
              nameData.originId = originId;
              console.log(`Row ${rowNumber}: Origin found in pre-fetched list: "${trimmedOrigin}" (ID: ${nameData.originId})`);
            } else if (newlyCreatedOrigins.has(originLower)) {
              nameData.originId = newlyCreatedOrigins.get(originLower);
              console.log(`Row ${rowNumber}: Origin found in newly created list: "${trimmedOrigin}" (ID: ${nameData.originId})`);
            } else {
              // Not in cache, check database (check both active and inactive)
              const originResult = await query(
                'SELECT id, name, "isActive" FROM origins WHERE LOWER(name) = LOWER($1)',
                [trimmedOrigin]
              );
              
              if (originResult.rows.length > 0) {
                // Found in database
                const origin = originResult.rows[0];
                nameData.originId = origin.id;
                
                // If inactive, reactivate it
                if (!origin.isActive) {
                  await query('UPDATE origins SET "isActive" = true WHERE id = $1', [origin.id]);
                  console.log(`Row ${rowNumber}: Reactivated inactive origin: "${origin.name}" (ID: ${origin.id})`);
                }
                
                // Add to cache
                existingOrigins.set(originLower, nameData.originId);
                console.log(`Row ${rowNumber}: Origin found in database: "${origin.name}" (ID: ${nameData.originId})`);
              } else {
                // Not found, create new origin
                try {
                  console.log(`Row ${rowNumber}: Origin "${trimmedOrigin}" not found, creating new origin...`);
                  
                  if (!trimmedOrigin || trimmedOrigin.length === 0) {
                    throw new Error('Origin name cannot be empty');
                  }
                  
                  if (trimmedOrigin.length > 50) {
                    throw new Error('Origin name cannot exceed 50 characters');
                  }
                  
                  // Check if it exists (including inactive)
                  const checkAgain = await query(
                    'SELECT id, name, "isActive" FROM origins WHERE LOWER(name) = LOWER($1)',
                    [trimmedOrigin]
                  );
                  
                  if (checkAgain.rows.length > 0) {
                    const origin = checkAgain.rows[0];
                    nameData.originId = origin.id;
                    
                    // If inactive, reactivate it
                    if (!origin.isActive) {
                      await query('UPDATE origins SET "isActive" = true WHERE id = $1', [origin.id]);
                      console.log(`Row ${rowNumber}: Reactivated inactive origin: "${origin.name}" (ID: ${origin.id})`);
                    }
                    
                    // Add to cache
                    existingOrigins.set(originLower, nameData.originId);
                    console.log(`Row ${rowNumber}: Origin found after recheck: "${origin.name}" (ID: ${nameData.originId})`);
                  } else {
                    const createResult = await query(
                      'INSERT INTO origins (name, "createdBy", "isActive") VALUES ($1, $2, $3) RETURNING id, name',
                      [trimmedOrigin, null, true]
                    );
                    
                    nameData.originId = createResult.rows[0].id;
                    // Add to both caches
                    existingOrigins.set(originLower, nameData.originId);
                    newlyCreatedOrigins.set(originLower, nameData.originId);
                    console.log(`Row ${rowNumber}: ✅ Created new origin "${createResult.rows[0].name}" (ID: ${nameData.originId})`);
                  }
                } catch (createError) {
                  console.error(`Row ${rowNumber}: Error creating origin "${trimmedOrigin}":`, createError);
                  
                  // If duplicate error, try to find it again
                  if (createError.code === '23505' || createError.message.includes('duplicate') || createError.message.includes('unique')) {
                    console.log(`Row ${rowNumber}: Duplicate origin detected, finding existing origin...`);
                    try {
                      const duplicateCheck = await query(
                        'SELECT id, name, "isActive" FROM origins WHERE LOWER(name) = LOWER($1)',
                        [trimmedOrigin]
                      );
                      if (duplicateCheck.rows.length > 0) {
                        const origin = duplicateCheck.rows[0];
                        nameData.originId = origin.id;
                        
                        if (!origin.isActive) {
                          await query('UPDATE origins SET "isActive" = true WHERE id = $1', [origin.id]);
                          console.log(`Row ${rowNumber}: Reactivated inactive duplicate origin: "${origin.name}" (ID: ${origin.id})`);
                        }
                        
                        existingOrigins.set(originLower, nameData.originId);
                        console.log(`Row ${rowNumber}: Found duplicate origin: "${origin.name}" (ID: ${nameData.originId})`);
                      } else {
                        nameData.originId = null;
                        console.log(`Row ${rowNumber}: Could not find or create origin, setting to null`);
                      }
                    } catch (findError) {
                      console.error(`Row ${rowNumber}: Could not find duplicate origin:`, findError);
                      nameData.originId = null;
                    }
                  } else {
                    nameData.originId = null;
                    console.log(`Row ${rowNumber}: Origin creation failed, setting to null`);
                  }
                }
              }
            }
          }
        } else {
          // If no origin provided in CSV, set to null
          nameData.originId = null;
          console.log(`Row ${rowNumber}: No origin provided in CSV, setting to null`);
        }

        console.log(`Row ${rowNumber}: Final originId: ${nameData.originId}`);
        // ========== ORIGIN HANDLING - END ==========
        // Check for duplicates using pre-fetched names (much faster)
        console.log(`Row ${rowNumber}: Checking for duplicates for "${nameData.name}"`);
        const nameLower = nameData.name.toLowerCase();
        
        if (existingNames.has(nameLower)) {
          console.log(`Row ${rowNumber}: Duplicate name found: "${nameData.name}"`);
          console.log(`Row ${rowNumber}: Import options - skipDuplicates: ${importOptions.skipDuplicates}, updateDuplicates: ${importOptions.updateDuplicates}, updateAndInsert: ${importOptions.updateAndInsert}`);
          if (importOptions.skipDuplicates) {
            results.skipped.push({
              row: rowNumber,
              name: nameData.name,
              reason: 'Duplicate name'
            });
            continue;
          } else if (importOptions.updateDuplicates || importOptions.updateAndInsert) {
            // Update existing name with new data
            console.log(`Row ${rowNumber}: Updating existing name: "${nameData.name}"`);
            try {
              const updateResult = await query(`
                UPDATE names 
                SET description = $1, "religionId" = $2, "originId" = $3, gender = $4, "updatedAt" = CURRENT_TIMESTAMP
                WHERE LOWER(name) = LOWER($5)
                RETURNING id
              `, [nameData.description || '', nameData.religionId, nameData.originId, nameData.gender, nameData.name]);
              
              console.log('Name updated successfully:', updateResult.rows[0]);
              results.successful.push({ 
                row: rowNumber, 
                name: nameData.name, 
                id: updateResult.rows[0].id,
                action: 'updated'
              });
              continue;
            } catch (updateError) {
              console.error(`Error updating row ${rowNumber}:`, updateError);
              results.failed.push({ 
                row: rowNumber, 
                name: nameData.name, 
                error: `Update failed: ${updateError.message}` 
              });
              continue;
            }
          } else {
            results.failed.push({
              row: rowNumber,
              name: nameData.name,
              error: 'Name already exists'
            });
            continue;
          }
        }

        // Validate gender before insert
        const validGenders = ['male', 'female', 'unisex'];
        if (!validGenders.includes(nameData.gender)) {
          console.log(`Row ${rowNumber}: Invalid gender "${nameData.gender}", defaulting to unisex`);
          nameData.gender = 'unisex';
        }
        
        // Insert the name
        console.log(`Row ${rowNumber}: Inserting name with data:`, {
          name: nameData.name,
          description: nameData.description,
          religionId: nameData.religionId,
          originId: nameData.originId,
          gender: nameData.gender
        });
        
        const insertResult = await query(`
          INSERT INTO names (name, description, "religionId", "originId", gender)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, name, "religionId", "originId", gender
        `, [
          nameData.name,
          nameData.description || '',
          nameData.religionId, // This can be null if no religion
          nameData.originId, // This can be null if no origin
          nameData.gender
        ]);

        console.log(`Row ${rowNumber}: ✅ Name inserted successfully:`, {
          id: insertResult.rows[0].id,
          name: insertResult.rows[0].name,
          religionId: insertResult.rows[0].religionId,
          originId: insertResult.rows[0].originId,
          gender: insertResult.rows[0].gender
        });
        results.successful.push({
          row: rowNumber,
          name: nameData.name,
          id: insertResult.rows[0].id
        });

      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        console.error(`Error details:`, {
          message: error.message,
          stack: error.stack,
          code: error.code,
          detail: error.detail,
          constraint: error.constraint
        });
        
        // Try to get the name from the row, with fallback
        let errorName = 'Unknown';
        try {
          if (columnMapping.name) {
            errorName = row[columnMapping.name] || 
                       row[columnMapping.name.toLowerCase()] || 
                       row[columnMapping.name.toUpperCase()] || 
                       'Unknown';
          }
        } catch (nameError) {
          // If we can't get the name, just use Unknown
        }
        
        results.failed.push({
          row: rowNumber,
          name: errorName,
          error: error.message || 'Unknown error',
          details: error.detail || error.constraint || undefined
        });
      }
      }
      
      // Log batch completion
      console.log(`Batch ${batchIndex + 1}/${totalBatches} completed. Successful: ${results.successful.length}, Failed: ${results.failed.length}, Skipped: ${results.skipped.length}`);
      
      // Add a small delay between batches to prevent overwhelming the database
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay between batches (reduced for better performance)
      }
    }

    // Log summary of newly created religions
    if (newlyCreatedReligions.size > 0) {
      console.log(`\n✅ CSV Import Summary - Created ${newlyCreatedReligions.size} new religions:`);
      newlyCreatedReligions.forEach((id, name) => {
        console.log(`   - ${name} (ID: ${id})`);
      });
    } else {
      console.log(`\n📊 CSV Import Summary - No new religions created (all religions already existed)`);
    }
    
    // Update import record
    await query(`
      UPDATE csv_imports 
      SET "successfulRows" = $1, "failedRows" = $2, "skippedRows" = $3, 
          "importStatus" = 'completed', "completedAt" = CURRENT_TIMESTAMP,
          "errorLog" = $4
      WHERE id = $5
    `, [
      results.successful.length,
      results.failed.length,
      results.skipped.length,
      JSON.stringify(results.failed),
      importId
    ]);

    res.json({
      success: true,
      data: {
        importId,
        results: {
          total: csvDataToProcess.length,
          successful: results.successful.length,
          failed: results.failed.length,
          skipped: results.skipped.length
        },
        details: results,
        religionsCreated: newlyCreatedReligions.size
      }
    });

  } catch (error) {
    console.error('CSV import error:', error);
    console.error('CSV import error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      column: error.column
    });
    
    // Update import record with error status if importId exists
    if (importId) {
      try {
        const errorMessage = error.message || 'Unknown error';
        const errorDetail = error.detail || error.stack || '';
        await query(`
          UPDATE csv_imports 
          SET "importStatus" = 'failed', "completedAt" = CURRENT_TIMESTAMP,
              "errorLog" = $1
          WHERE id = $2
        `, [JSON.stringify({ message: errorMessage, detail: errorDetail }), importId]);
      } catch (updateError) {
        console.error('Error updating import record:', updateError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: `Error processing CSV import: ${error.message || 'Unknown error'}`,
      detail: error.detail || error.stack || undefined
    });
  }
};

// Get import history
exports.getImportHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const result = await query(`
      SELECT ci.*, u.name as imported_by_name
      FROM csv_imports ci
      LEFT JOIN users u ON ci."importedBy" = u.id
      ORDER BY ci."createdAt" DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await query('SELECT COUNT(*) FROM csv_imports');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    });

  } catch (error) {
    console.error('Error getting import history:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting import history'
    });
  }
};

// Helper function to read CSV from file for large datasets
async function readCSVFromFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    console.log(`Reading CSV from file: ${filePath}`);
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', () => {
        console.log(`Successfully read ${results.length} rows from file`);
        // Clean up file after reading
        try {
          fs.unlinkSync(filePath);
          console.log(`File cleaned up: ${filePath}`);
        } catch (cleanupError) {
          console.warn(`Warning: Could not clean up file ${filePath}:`, cleanupError.message);
        }
        resolve(results);
      })
      .on('error', (error) => {
        console.error(`Error reading file ${filePath}:`, error);
        // Try to clean up file even on error
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          console.warn(`Warning: Could not clean up file ${filePath}:`, cleanupError.message);
        }
        reject(error);
      });
  });
}

// Helper function to get religion variations for flexible matching
function getReligionVariations(religion) {
  const lowerReligion = religion.toLowerCase().trim();
  const variations = [];
  
  // Common religion variations
  const religionMap = {
    'hindu': ['hinduism', 'hindu', 'hindus', 'sanatan'],
    'hinduism': ['hindu', 'hindus', 'sanatan'],
    'christian': ['christianity', 'christian', 'christians', 'christ'],
    'christianity': ['christian', 'christians', 'christ'],
    'muslim': ['islam', 'muslim', 'muslims', 'islamic'],
    'islam': ['muslim', 'muslims', 'islamic'],
    'sikh': ['sikhism', 'sikh', 'sikhs'],
    'sikhism': ['sikh', 'sikhs'],
    'buddhist': ['buddhism', 'buddhist', 'buddhists', 'buddha'],
    'buddhism': ['buddhist', 'buddhists', 'buddha'],
    'jain': ['jainism', 'jain', 'jains'],
    'jainism': ['jain', 'jains']
  };
  
  // Add exact match
  variations.push(lowerReligion);
  
  // Add variations from map
  if (religionMap[lowerReligion]) {
    variations.push(...religionMap[lowerReligion]);
  }
  
  // Add reverse lookup
  for (const [key, values] of Object.entries(religionMap)) {
    if (values.includes(lowerReligion)) {
      variations.push(key);
      variations.push(...values);
    }
  }
  
  // Remove duplicates
  return [...new Set(variations)];
}

// Helper function to normalize gender input
function normalizeGender(gender) {
  if (!gender) return 'unisex';
  
  const lowerGender = gender.toLowerCase().trim();
  
  // Flexible gender matching
  if (lowerGender === 'male' || lowerGender === 'm' || lowerGender === 'boy' || lowerGender === 'masculine') {
    return 'male';
  }
  
  if (lowerGender === 'female' || lowerGender === 'f' || lowerGender === 'girl' || lowerGender === 'feminine') {
    return 'female';
  }
  
  if (lowerGender === 'unisex' || lowerGender === 'u' || lowerGender === 'both' || lowerGender === 'neutral') {
    return 'unisex';
  }
  
  // Default to unisex if no match
  return 'unisex';
}

// Helper function to detect gender from name
function detectGender(name) {
  const lowerName = name.toLowerCase().trim();
  
  // International male names
  const maleNames = [
    'john', 'david', 'michael', 'james', 'robert', 'william', 'richard', 'charles', 'thomas', 'christopher',
    'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua', 'kenneth',
    'kevin', 'brian', 'george', 'edward', 'ronald', 'timothy', 'jason', 'jeffrey', 'ryan', 'jacob',
    'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon', 'benjamin',
    'samuel', 'gregory', 'alexander', 'patrick', 'jack', 'dennis', 'jerry', 'tyler', 'aaron', 'jose',
    'henry', 'adam', 'douglas', 'nathan', 'peter', 'zachary', 'kyle', 'walter', 'harold', 'carl',
    'jeremy', 'arthur', 'lawrence', 'sean', 'christian', 'ethan', 'austin', 'joe', 'albert', 'juan',
    'wayne', 'roy', 'ralph', 'eugene', 'louis', 'philip', 'bobby', 'johnny', 'raymond', 'alex'
  ];
  
  // International female names
  const femaleNames = [
    'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen',
    'nancy', 'lisa', 'betty', 'helen', 'sandra', 'donna', 'carol', 'ruth', 'sharon', 'michelle',
    'laura', 'sarah', 'kimberly', 'deborah', 'dorothy', 'lisa', 'nancy', 'karen', 'betty', 'helen',
    'sandra', 'donna', 'carol', 'ruth', 'sharon', 'michelle', 'laura', 'sarah', 'kimberly', 'deborah',
    'dorothy', 'amy', 'angela', 'brenda', 'emma', 'olivia', 'cynthia', 'marie', 'janet', 'catherine',
    'frances', 'christine', 'samantha', 'debra', 'rachel', 'carolyn', 'janet', 'virginia', 'maria',
    'heather', 'diane', 'julie', 'joyce', 'victoria', 'kelly', 'christina', 'joan', 'evelyn', 'judith',
    'megan', 'cheryl', 'andrea', 'hannah', 'jacqueline', 'martha', 'gloria', 'teresa', 'sara', 'janice',
    'maria', 'julia', 'grace', 'judy', 'theresa', 'madison', 'beverly', 'denise', 'marilyn', 'amber',
    'danielle', 'rose', 'brittany', 'diana', 'abigail', 'jane', 'lori', 'alexis', 'kayla', 'tiffany'
  ];
  
  // Indian male names
  const indianMaleNames = [
    'kumar', 'singh', 'raj', 'dev', 'ram', 'krishna', 'arjun', 'vikram', 'suresh', 'rajesh',
    'mohan', 'suresh', 'ramesh', 'anil', 'sunil', 'vijay', 'sanjay', 'ajay', 'pradeep', 'deepak',
    'manish', 'naveen', 'sachin', 'rohit', 'amit', 'rahul', 'sandeep', 'vinod', 'ashok', 'dilip'
  ];
  
  // Indian female names
  const indianFemaleNames = [
    'kumari', 'devi', 'rani', 'priya', 'sita', 'laxmi', 'kavita', 'sunita', 'rekha', 'meera',
    'pooja', 'neha', 'priyanka', 'anjali', 'deepika', 'kiran', 'usha', 'sushma', 'geeta', 'radha',
    'sarita', 'manju', 'savita', 'pinki', 'sonia', 'ritu', 'shilpa', 'kavita', 'sunita', 'rekha'
  ];
  
  // Check for exact matches first
  if (maleNames.includes(lowerName) || indianMaleNames.includes(lowerName)) {
    return 'male';
  }
  
  if (femaleNames.includes(lowerName) || indianFemaleNames.includes(lowerName)) {
    return 'female';
  }
  
  // Check for partial matches (suffixes/prefixes)
  const maleSuffixes = ['kumar', 'singh', 'raj', 'dev', 'ram', 'krishna'];
  const femaleSuffixes = ['kumari', 'devi', 'rani', 'priya', 'sita', 'laxmi'];
  
  for (const suffix of maleSuffixes) {
    if (lowerName.includes(suffix)) return 'male';
  }
  
  for (const suffix of femaleSuffixes) {
    if (lowerName.includes(suffix)) return 'female';
  }
  
  // Check for common endings
  if (lowerName.endsWith('a') || lowerName.endsWith('i') || lowerName.endsWith('e')) {
    return 'female';
  }
  
  if (lowerName.endsWith('n') || lowerName.endsWith('r') || lowerName.endsWith('d')) {
    return 'male';
  }
  
  // Default to unisex if no pattern matches
  return 'unisex';
}
