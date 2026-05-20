const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../config/logger');

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"

    if (!token) {
      return res.status(401).json({ status: 'error', message: 'Access Denied: No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jagriti_fallback_secret');
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Access Denied: User session expired or invalid.' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Error in JWT Authentication middleware:', error);
    return res.status(401).json({ status: 'error', message: 'Access Denied: Invalid authentication token.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Forbidden: Admin access required.' });
  }
  next();
};

module.exports = {
  authenticateUser,
  requireAdmin
};
