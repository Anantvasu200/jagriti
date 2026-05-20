const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/otp/mobile', authController.sendMobileOtp);
router.post('/otp/email', authController.sendEmailOtp);
router.post('/signup', authController.signup);
router.post('/signin', authController.signin);

module.exports = router;
