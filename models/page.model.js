/**
 * Page Model
 *
 * Description: Manages CRUD operations for the pages table.
 * Features:
 * - Handles custom pages created by admin
 * - SEO support (meta_title, meta_description, meta_keywords)
 * - Slug-based routing for frontend
 * - Pagination and search functionality
 *
 * Database Table: pages
 * Required Indexes: idx_pages_slug, idx_pages_is_active, idx_pages_title
 */

const { query, getClient } = require('../config/database');

class Page {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.slug = data.slug;
    this.content = data.content;
    this.metaTitle = data.metaTitle || data.meta_title;
    this.metaDescription = data.metaDescription || data.meta_description;
    this.metaKeywords = data.metaKeywords || data.meta_keywords;
    this.isActive = data.isActive !== undefined ? data.isActive : (data.is_active !== undefined ? data.is_active : true);
    this.createdBy = data.createdBy || data.created_by;
    this.updatedBy = data.updatedBy || data.updated_by;
    this.createdAt = data.createdAt || data.created_at;
    this.updatedAt = data.updatedAt || data.updated_at;

    // Extra data jo JOIN se aayega
    this.createdByUser = data.creator_name ? { name: data.creator_name } : null;
    this.updatedByUser = data.updater_name ? { name: data.updater_name } : null;
  }

  /**
   * Naya page create karta hai
   */
  static async create(pageData) {
    const { title, slug, content, metaTitle, metaDescription, metaKeywords, createdBy } = pageData;
    
    const result = await query(
      `INSERT INTO pages (title, slug, content, meta_title, meta_description, meta_keywords, "createdBy") 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [title, slug, content, metaTitle || null, metaDescription || null, metaKeywords || null, createdBy]
    );

    return new Page(result.rows[0]);
  }

  /**
   * ID se ek specific page ko dhoondhta hai
   */
  static async findById(id) {
    const result = await query(`
      SELECT 
        p.*, 
        creator.name as creator_name, 
        updater.name as updater_name
      FROM pages p
      LEFT JOIN users creator ON p."createdBy" = creator.id
      LEFT JOIN users updater ON p."updatedBy" = updater.id
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    return new Page(result.rows[0]);
  }

  /**
   * Slug se ek active page ko dhoondhta hai (frontend ke liye)
   */
  static async findBySlug(slug) {
    const result = await query(
      `SELECT * FROM pages WHERE slug = $1 AND "isActive" = true LIMIT 1`,
      [slug]
    );

    if (result.rows.length === 0) return null;

    return new Page(result.rows[0]);
  }

  /**
   * Saare pages ko filters, sorting, aur pagination ke saath dhoondhta hai
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

    // General search (searches in title, slug, and content)
    if (filterQuery.search) {
      whereClause += ` AND (title ILIKE $${paramCount} OR slug ILIKE $${paramCount} OR content ILIKE $${paramCount})`;
      values.push(`%${filterQuery.search}%`);
      paramCount += 1;
    }

    // ORDER BY clause
    let orderBy = 'ORDER BY "createdAt" DESC'; // Default sort
    if (sort.createdAt === 1) {
      orderBy = 'ORDER BY "createdAt" ASC';
    } else if (sort.title === 1) {
      orderBy = 'ORDER BY title ASC';
    } else if (sort.title === -1) {
      orderBy = 'ORDER BY title DESC';
    }

    const queryText = `
      SELECT * 
      FROM pages
      ${whereClause}
      ${orderBy}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    values.push(parseInt(limit), parseInt(offset));
    const result = await query(queryText, values);
    
    return result.rows.map(row => new Page(row));
  }

  /**
   * Filters ke basis par total documents count karta hai (pagination ke liye)
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
      whereClause += ` AND (title ILIKE $${paramCount} OR slug ILIKE $${paramCount} OR content ILIKE $${paramCount})`;
      values.push(`%${filterQuery.search}%`);
      paramCount += 1;
    }

    const result = await query(`SELECT COUNT(*) as count FROM pages ${whereClause}`, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Page ko update karta hai
   */
  static async findByIdAndUpdate(id, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      // Map JavaScript property names to database column names
      if (key === 'isActive' || key === 'is_active') {
        fields.push(`"isActive" = $${paramCount}`);
      } else if (key === 'metaTitle' || key === 'meta_title') {
        fields.push(`meta_title = $${paramCount}`);
      } else if (key === 'metaDescription' || key === 'meta_description') {
        fields.push(`meta_description = $${paramCount}`);
      } else if (key === 'metaKeywords' || key === 'meta_keywords') {
        fields.push(`meta_keywords = $${paramCount}`);
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

    const updateQuery = `UPDATE pages SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await query(updateQuery, values);

    if (result.rows.length === 0) return null;
    return new Page(result.rows[0]);
  }

  /**
   * ID se ek page ko delete karta hai
   */
  static async findByIdAndDelete(id) {
    const result = await query('DELETE FROM pages WHERE id = $1 RETURNING *', [id]);
    return result.rows.length > 0 ? new Page(result.rows[0]) : null;
  }
}

module.exports = Page;

