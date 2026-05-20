const express = require('express');
const router = express.Router();
const { generateDeveloperKey } = require('../controllers/apiDeveloperController');

router.post('/keys', generateDeveloperKey);

module.exports = router;
