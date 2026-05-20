const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/safety', reportController.generateSafetyReport);

module.exports = router;
