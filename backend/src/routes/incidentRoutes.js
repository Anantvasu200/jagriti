const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');

router.get('/', incidentController.getIncidents);
router.post('/', incidentController.createIncident);

router.post('/report', incidentController.reportCommunityIncident);
router.post('/:id/confirm', incidentController.confirmCommunityIncident);

module.exports = router;
