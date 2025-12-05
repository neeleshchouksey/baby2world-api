const { query } = require('../config/database');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

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
    // Get available religions for mapping
    const religionsResult = await query('SELECT id, name FROM religions WHERE "isActive" = true ORDER BY name');
    
    const mappingFields = {
      required: [
        { field: 'name', label: 'Name', type: 'text', required: true },
        { field: 'gender', label: 'Gender', type: 'select', required: true, options: ['male', 'female', 'unisex'] }
      ],
      optional: [
        { field: 'description', label: 'Description', type: 'text', required: false },
        { field: 'religionId', label: 'Religion', type: 'select', required: false, options: religionsResult.rows }
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
    const userId = req.user?.id;

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

    // Validate required mappings
    if (!columnMapping.name) {
      console.log('CSV Import - Name mapping is required');
      return res.status(400).json({
        success: false,
        error: 'Name mapping is required'
      });
    }
    
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
      INSERT INTO csv_imports (filename, total_rows, successful_rows, failed_rows, skipped_rows, import_status, column_mapping, imported_by)
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
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, csvDataToProcess.length);
      const batch = csvDataToProcess.slice(startIndex, endIndex);
      
      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (rows ${startIndex + 1}-${endIndex})`);
      
      for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const rowNumber = startIndex + i + 1;
      
      console.log(`CSV Import - Processing row ${rowNumber}:`, row);

      try {
        // Extract data based on mapping
        const nameData = {
          name: row[columnMapping.name]?.trim(),
          gender: columnMapping.gender === 'auto' ? 'unisex' : row[columnMapping.gender]?.trim(),
          description: columnMapping.description ? row[columnMapping.description]?.trim() : '',
          religionId: columnMapping.religionId || columnMapping.religion_id ? (row[columnMapping.religionId] || row[columnMapping.religion_id]) : null
        };

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
        if (columnMapping.gender === 'auto') {
          // Auto-detect gender based on name patterns or use unisex
          const detectedGender = detectGender(nameData.name);
          nameData.gender = detectedGender;
          console.log(`Row ${rowNumber}: Auto-detected gender for "${nameData.name}": ${detectedGender}`);
        } else {
          // Normalize gender input (case-insensitive, flexible matching)
          const normalizedGender = normalizeGender(nameData.gender);
          nameData.gender = normalizedGender;
          console.log(`Row ${rowNumber}: Using mapped gender for "${nameData.name}": ${normalizedGender} (from "${nameData.gender}")`);
        }

        // Handle religion mapping - religionId is REQUIRED
        const religionValue = nameData.religionId;
        if (religionValue) {
          // If religionId is a string (religion name), find the ID
          if (isNaN(religionValue)) {
            // Try multiple religion matching strategies
            let religionResult = await query(
              'SELECT id, name FROM religions WHERE LOWER(name) = LOWER($1) AND "isActive" = true',
              [religionValue]
            );
            
            // If exact match not found, try partial match
            if (religionResult.rows.length === 0) {
              religionResult = await query(
                'SELECT id, name FROM religions WHERE LOWER(name) LIKE LOWER($1) AND "isActive" = true',
                [`%${religionValue}%`]
              );
            }
            
            // If still not found, try common variations
            if (religionResult.rows.length === 0) {
              const religionVariations = getReligionVariations(religionValue);
              for (const variation of religionVariations) {
                religionResult = await query(
                  'SELECT id, name FROM religions WHERE LOWER(name) = LOWER($1) AND "isActive" = true',
                  [variation]
                );
                if (religionResult.rows.length > 0) break;
              }
            }
            if (religionResult.rows.length > 0) {
              nameData.religionId = religionResult.rows[0].id;
              console.log(`Row ${rowNumber}: Religion matched "${religionResult.rows[0].name}" (ID: ${nameData.religionId}) for input "${religionValue}"`);
            } else {
              // If religion not found, skip this row
              console.log(`Row ${rowNumber}: Religion "${religionValue}" not found, skipping`);
              results.skipped.push({
                row: rowNumber,
                name: nameData.name,
                reason: 'Religion not found'
              });
              continue;
            }
          } else {
            nameData.religionId = parseInt(religionValue);
          }
        } else {
          // If no religion provided, leave it null (database will use default)
          console.log(`Row ${rowNumber}: No religion provided, using database default`);
          nameData.religionId = null; // Let database handle the default
        }

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
                SET description = $1, "religionId" = $2, gender = $3, "updatedAt" = CURRENT_TIMESTAMP
                WHERE LOWER(name) = LOWER($4)
                RETURNING id
              `, [nameData.description || '', nameData.religionId, nameData.gender, nameData.name]);
              
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

        // Insert the name
        console.log('Inserting name:', nameData); // Debug log
        const insertResult = await query(`
          INSERT INTO names (name, description, "religionId", gender)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [
          nameData.name,
          nameData.description || '',
          nameData.religionId,
          nameData.gender
        ]);

        console.log('Name inserted successfully:', insertResult.rows[0]); // Debug log
        results.successful.push({
          row: rowNumber,
          name: nameData.name,
          id: insertResult.rows[0].id
        });

      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.failed.push({
          row: rowNumber,
          name: row[columnMapping.name] || 'Unknown',
          error: error.message
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
        details: results
      }
    });

  } catch (error) {
    console.error('CSV import error:', error);
    
    // Update import record with error status if importId exists
    if (importId) {
      try {
        await query(`
          UPDATE csv_imports 
          SET "importStatus" = 'failed', "completedAt" = CURRENT_TIMESTAMP,
              "errorLog" = $1
          WHERE id = $2
        `, [error.message, importId]);
      } catch (updateError) {
        console.error('Error updating import record:', updateError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: `Error processing CSV import: ${error.message}`
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
