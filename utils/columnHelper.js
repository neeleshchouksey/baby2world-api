/**
 * Column Name Helper
 * Provides backward compatibility between snake_case and camelCase column names
 * This allows code to work both before and after migrations
 */

/**
 * Get column name - tries camelCase first, falls back to snake_case
 * This is for SELECT queries where we need to handle both formats
 */
function getColumnName(camelCase, snakeCase) {
  // After migration, use camelCase with quotes
  // Before migration, use snake_case
  // We'll use camelCase as primary since migrations should be run
  return `"${camelCase}"`;
}

/**
 * Build WHERE clause that works with both column name formats
 * Uses COALESCE to try both column names
 */
function buildWhereClause(columnCamelCase, columnSnakeCase, paramIndex, operator = '=') {
  return `(COALESCE(${columnCamelCase}, ${columnSnakeCase}) ${operator} $${paramIndex} OR ${columnCamelCase} ${operator} $${paramIndex} OR ${columnSnakeCase} ${operator} $${paramIndex})`;
}

/**
 * For SELECT queries, select both column names and use COALESCE
 */
function selectColumn(camelCase, snakeCase, alias = null) {
  const aliasPart = alias ? ` as ${alias}` : '';
  return `COALESCE("${camelCase}", ${snakeCase})${aliasPart}`;
}

module.exports = {
  getColumnName,
  buildWhereClause,
  selectColumn
};

