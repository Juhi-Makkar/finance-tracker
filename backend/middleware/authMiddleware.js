const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      
      // Check if email is verified
      if (!req.user.isEmailVerified) {
        return res.status(403).json({ 
          message: 'Please verify your email to access this resource.',
          requiresVerification: true,
          email: req.user.email,
        });
      }
      
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized. Token invalid.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized. No token provided.' });
  }
};

module.exports = { protect };