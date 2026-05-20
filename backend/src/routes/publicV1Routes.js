const express = require('express');
const router = express.Router();
const { getIncidents } = require('../controllers/incidentController');
const { validateApiKey } = require('../controllers/apiDeveloperController');
const rateLimit = require('express-rate-limit');

// Custom developer rate limiter: 500 requests per hour
const publicApiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 500,
  keyGenerator: (req) => {
    return req.developer ? req.developer.id : req.ip;
  },
  validate: false,
  message: {
    status: 'error',
    message: 'Too many requests on public API. Rate limit is 500 requests per hour.'
  }
});

// Apply API validation and rate limiter
router.use(validateApiKey);
router.use(publicApiLimiter);

// GET /api/v1/incidents
router.get('/incidents', getIncidents);

module.exports = router;
