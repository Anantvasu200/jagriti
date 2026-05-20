const { ApiKey } = require('../models');
const crypto = require('crypto');
const logger = require('../config/logger');

// Generate a new API key
const generateDeveloperKey = async (req, res) => {
  try {
    const { developerName } = req.body;
    if (!developerName || developerName.trim() === '') {
      return res.status(400).json({ status: 'error', message: 'Developer name is required' });
    }

    const rawKey = crypto.randomBytes(24).toString('hex');
    const token = `jg_live_${rawKey}`;

    const newKey = await ApiKey.create({
      key: token,
      developerName,
      status: 'active'
    });

    res.status(201).json({
      status: 'success',
      data: {
        id: newKey.id,
        key: newKey.key,
        developerName: newKey.developerName,
        createdAt: newKey.createdAt
      }
    });
  } catch (error) {
    logger.error('Error generating developer key:', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate API key' });
  }
};

// Validate API Key Middleware
const validateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    if (!apiKey) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Access Denied: Missing API Key. Use x-api-key header or ?apiKey= query param.' 
      });
    }

    const keyRecord = await ApiKey.findOne({ where: { key: apiKey } });

    if (!keyRecord) {
      return res.status(403).json({ status: 'error', message: 'Access Denied: Invalid API Key.' });
    }

    if (keyRecord.status !== 'active') {
      return res.status(403).json({ status: 'error', message: 'Access Denied: This API Key has been revoked.' });
    }

    req.developer = {
      id: keyRecord.id,
      developerName: keyRecord.developerName
    };

    next();
  } catch (error) {
    logger.error('Error in API key validation:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error validating key' });
  }
};

module.exports = {
  generateDeveloperKey,
  validateApiKey
};
