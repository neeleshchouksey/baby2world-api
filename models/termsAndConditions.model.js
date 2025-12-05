/**
 * TermsAndConditions Model
 *
 * Description: Manages CRUD operations for the terms_and_conditions table.
 * Features:
 * - Handles versioning and ensures only one version is active at a time.
 * - Pagination support for listing all versions.
 * - Search functionality within version name and content.
 * - Uses database transactions for critical updates to maintain data integrity.
 *
 * Database Table: terms_and_conditions
 * Required Indexes: idx_terms_and_conditions_is_active, idx_terms_and_conditions_version
 */

const { query, getClient } = require('../config/database');

class TermsAndConditions {
  // Constructor database se mile data ko object mein badalta hai
  constructor(data) {
    this.id = data.id;
    this.version = data.version;
    this.content = data.content;
    this.isActive = data.isActive !== undefined ? data.isActive : (data.is_active !== undefined ? data.is_active : false);
    this.publishedAt = data.publishedAt || data.published_at;
    this.createdBy = data.createdBy || data.created_by;
    this.updatedBy = data.updatedBy || data.updated_by;
    this.createdAt = data.createdAt || data.created_at;
    this.updatedAt = data.updatedAt || data.updated_at;

    // Extra data jo JOIN se aayega
    this.createdByUser = data.creator_name ? { name: data.creator_name } : null;
    this.updatedByUser = data.updater_name ? { name: data.updater_name } : null;
  }

  /**
   * Naya T&C version create karta hai.
   * By default, naya version active nahi hota (is_active = false).
   */
  static async create(tncData) {
    const { version, content, createdBy } = tncData;
    
    const result = await query(
      `INSERT INTO terms_and_conditions (version, content, "createdBy") 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [version, content, createdBy]
    );

    return new TermsAndConditions(result.rows[0]);
  }

  /**
   * ID se ek specific T&C version ko dhoondhta hai.
   * Saath mein creator aur updater ka naam bhi lata hai.
   */
  static async findById(id) {
    const result = await query(`
      SELECT 
        tnc.*, 
        creator.name as creator_name, 
        updater.name as updater_name
      FROM terms_and_conditions tnc
      LEFT JOIN users creator ON tnc."createdBy" = creator.id
      LEFT JOIN users updater ON tnc."updatedBy" = updater.id
      WHERE tnc.id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    return new TermsAndConditions(result.rows[0]);
  }
  
  /**
   * Kaunsa T&C version abhi active hai, use dhoondhta hai.
   * Ye sabse common operation hoga user-facing side ke liye.
   */
  static async findOneActive() {
    const result = await query(
      `SELECT * FROM terms_and_conditions WHERE "isActive" = true LIMIT 1`
    );

    if (result.rows.length === 0) return null;

    return new TermsAndConditions(result.rows[0]);
  }

  /**
   * Saare T&C versions ko filters, sorting, aur pagination ke saath dhoondhta hai.
   * Admin panel ke liye bahut useful hai.
   */
  static async find(filterQuery = {}, options = {}) {
    const { page = 1, limit = 15, sort = { createdAt: -1 } } = options;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramCount = 1;

    // Filter by active status
    if (filterQuery.isActive !== undefined) {
      whereClause += ` AND "isActive" = $${paramCount}`;
      values.push(filterQuery.isActive);
      paramCount++;
    }

    // General search (searches in version and content)
    if (filterQuery.search) {
      whereClause += ` AND (version ILIKE $${paramCount} OR content ILIKE $${paramCount})`;
      values.push(`%${filterQuery.search}%`);
      paramCount += 1; // Same search term dono fields me use ho raha hai
    }

    // ORDER BY clause
    let orderBy = 'ORDER BY "createdAt" DESC'; // Default sort
    if (sort.createdAt === 1) {
      orderBy = 'ORDER BY "createdAt" ASC';
    } else if (sort.version === 1) {
      orderBy = 'ORDER BY version ASC';
    } else if (sort.version === -1) {
        orderBy = 'ORDER BY version DESC';
    }

    const queryText = `
      SELECT * 
      FROM terms_and_conditions
      ${whereClause}
      ${orderBy}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await query(queryText, values);
    
    return result.rows.map(row => new TermsAndConditions(row));
  }

  /**
   * Filters ke basis par total documents count karta hai (pagination ke liye).
   */
  static async countDocuments(filterQuery = {}) {
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filterQuery.isActive !== undefined) {
      whereClause += ` AND "isActive" = $${paramCount}`;
      values.push(filterQuery.isActive);
      paramCount++;
    }

    if (filterQuery.search) {
      whereClause += ` AND (version ILIKE $${paramCount} OR content ILIKE $${paramCount})`;
      values.push(`%${filterQuery.search}%`);
      paramCount += 1;
    }

    const result = await query(`SELECT COUNT(*) as count FROM terms_and_conditions ${whereClause}`, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * T&C ko update karta hai. Ye ek TRANSACTION ka use karta hai.
   * Agar is_active = true set kiya ja raha hai, to ye pehle baaki sabko false karega.
   */
  static async findByIdAndUpdate(id, updateData) {
    const client = await getClient(); // Transaction ke liye ek client connection lete hain

    try {
      await client.query('BEGIN'); // Transaction shuru

      // Agar hum ek T&C ko active kar rahe hain...
      if (updateData.isActive === true || updateData.is_active === true) {
        // ... to pehle baaki sabhi T&C ko inactive kar do.
        await client.query('UPDATE terms_and_conditions SET "isActive" = false WHERE id != $1', [id]);
        // Aur iska publishing time set kar do.
        updateData.publishedAt = updateData.publishedAt || updateData.published_at || new Date();
      }

      // Ab original record ko update karo.
      const fields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updateData)) {
        // Map JavaScript property names to camelCase database column names
        if (key === 'isActive' || key === 'is_active') {
          fields.push(`"isActive" = $${paramCount}`);
        } else if (key === 'publishedAt' || key === 'published_at') {
          fields.push(`"publishedAt" = $${paramCount}`);
        } else if (key === 'createdBy' || key === 'created_by') {
          fields.push(`"createdBy" = $${paramCount}`);
        } else if (key === 'updatedBy' || key === 'updated_by') {
          fields.push(`"updatedBy" = $${paramCount}`);
        } else if (key === 'createdAt' || key === 'created_at') {
          fields.push(`"createdAt" = $${paramCount}`);
        } else if (key === 'updatedAt' || key === 'updated_at') {
          fields.push(`"updatedAt" = $${paramCount}`);
        } else {
          fields.push(`"${key}" = $${paramCount}`);
        }
        values.push(value);
        paramCount++;
      }
      fields.push(`"updatedAt" = CURRENT_TIMESTAMP`);
      values.push(id);

      const updateQuery = `UPDATE terms_and_conditions SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await client.query(updateQuery, values);

      await client.query('COMMIT'); // Sab theek raha, to changes save karo

      if (result.rows.length === 0) return null;
      return new TermsAndConditions(result.rows[0]);

    } catch (e) {
      await client.query('ROLLBACK'); // Kuch gadbad hui, to saare changes reverse karo
      throw e; // Error ko aage bhej do taaki controller handle kar sake
    } finally {
      client.release(); // Connection ko pool mein wapas bhej do
    }
  }

  /**
   * ID se ek T&C version ko delete karta hai.
   */
  static async findByIdAndDelete(id) {
    const result = await query('DELETE FROM terms_and_conditions WHERE id = $1 RETURNING *', [id]);
    return result.rows.length > 0 ? new TermsAndConditions(result.rows[0]) : null;
  }
}

module.exports = TermsAndConditions;