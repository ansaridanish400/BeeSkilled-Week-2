const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes — verify JWT from Authorization header
const protect = async (req, res, next) => {
  let token;

  // Expect: Authorization: Bearer <token>
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    // Distinguish expired vs malformed
    const message =
      error.name === 'TokenExpiredError'
        ? 'Not authorized, token expired'
        : 'Not authorized, token invalid';
    return res.status(401).json({ success: false, message });
  }
};

module.exports = { protect };
