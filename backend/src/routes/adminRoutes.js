const express = require('express');
const router = express.Router();
const { authenticateUser, requireAdmin } = require('../middleware/authMiddleware');
const { getAdminMetrics, verifyIncident } = require('../controllers/adminController');

router.get('/metrics', authenticateUser, requireAdmin, getAdminMetrics);
router.post('/incidents/:id/verify', authenticateUser, requireAdmin, verifyIncident);

module.exports = router;
