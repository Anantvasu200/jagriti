const express = require('express');
const router = express.Router();
const { authenticateUser, requireAdmin } = require('../middleware/authMiddleware');
const { getAdminMetrics } = require('../controllers/adminController');

router.get('/metrics', authenticateUser, requireAdmin, getAdminMetrics);

module.exports = router;
