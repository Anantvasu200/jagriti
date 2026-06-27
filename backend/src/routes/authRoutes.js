const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/authMiddleware');

router.post('/otp/mobile', authController.sendMobileOtp);
router.post('/otp/email', authController.sendEmailOtp);
router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.put('/settings', authenticateUser, authController.updateSettings);

module.exports = router;
