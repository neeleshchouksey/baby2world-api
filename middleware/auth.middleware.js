const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
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
    
    // Add user info to request
    req.userId = decoded.userId;
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