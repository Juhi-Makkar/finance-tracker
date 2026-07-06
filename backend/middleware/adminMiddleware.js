const jwt = require('jsonwebtoken');
const User = require('../models/User');

const adminProtect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return res.status(401).json({ message: 'User not found.' });
      if (user.isBlocked) return res.status(403).json({ message: 'Account is blocked.' });
      if (!user.isAdmin) return res.status(403).json({ message: 'Admin access required.' });
      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Not authorized.' });
    }
  } else {
    return res.status(401).json({ message: 'No token provided.' });
  }
};

module.exports = { adminProtect };