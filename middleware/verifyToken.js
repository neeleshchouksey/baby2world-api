const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ message: 'A token is required for authentication.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // User ki details ko request object mein daalna
  } catch (err) {
    return res.status(401).json({ message: 'Invalid Token.' });
  }
  
  return next(); // Sab theek hai to agle function par jaao
};

module.exports = verifyToken;