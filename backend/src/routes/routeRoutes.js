const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');

router.post('/safety-check', routeController.safetyCheck);
router.get('/toll-estimate', routeController.tollEstimate);
router.post('/suggest', routeController.suggest);

module.exports = router;
