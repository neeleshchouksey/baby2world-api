const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token, authorization denied'
      });
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '');

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if user is active (only for regular users, not admins)
    if (decoded.role === 'user') {
      const userId = decoded.id || decoded.userId;
      const userResult = await query('SELECT "isActive" FROM users WHERE id = $1', [userId]);
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Handle both camelCase and snake_case during transition
      const isActive = userResult.rows[0].isActive !== undefined ? userResult.rows[0].isActive : 
                      (userResult.rows[0]['isActive'] !== undefined ? userResult.rows[0]['isActive'] :
                      (userResult.rows[0].is_active !== undefined ? userResult.rows[0].is_active : true));
      
      if (!isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account has been deactivated. Please contact administrator.'
        });
      }
    }
    
    // Add user info to request
    req.userId = decoded.userId || decoded.id;
    req.user = decoded;
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token is not valid'
    });
  }
};

module.exports = authMiddleware;