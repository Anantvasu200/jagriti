const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { User } = require('../models');

// In-memory OTP storage with expiration
const otpStore = {};

// Helper to generate a 6-digit numeric OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.sendMobileOtp = async (req, res) => {
  const { mobileNumber } = req.body;
  if (!mobileNumber) {
    return res.status(400).json({ status: 'error', message: 'Mobile number is required' });
  }

  const otp = generateOTP();
  otpStore[mobileNumber] = {
    otp,
    expires: Date.now() + 5 * 60 * 1000 // 5 minutes validity
  };

  console.log(`\n📲 ======================================================`);
  console.log(`📲 [MOBILE OTP] Verification code for ${mobileNumber}: ${otp}`);
  console.log(`📲 ======================================================\n`);

  return res.status(200).json({
    status: 'success',
    message: 'Verification code sent to mobile number successfully (mock provider).',
    otp // Exposed in JSON response for sandbox ease-of-use
  });
};

exports.sendEmailOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ status: 'error', message: 'Email address is required' });
  }

  const otp = generateOTP();
  otpStore[email] = {
    otp,
    expires: Date.now() + 5 * 60 * 1000 // 5 minutes validity
  };

  console.log(`\n📧 ======================================================`);
  console.log(`📧 [EMAIL OTP] Verification code for ${email}: ${otp}`);
  console.log(`📧 ======================================================\n`);

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"Jagriti Safety Network" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔑 Jagriti Safety - Account Verification OTP',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #334155;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 28px; font-weight: 800; color: #0ea5e9; letter-spacing: 0.5px;">JAGRITI</span>
            <div style="font-size: 11px; text-transform: uppercase; tracking-wider: 1px; color: #64748b; font-weight: 700; margin-top: 4px;">Active Women's Safety Net</div>
          </div>
          <h2 style="font-size: 18px; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 12px; text-align: center;">Verify Your Account</h2>
          <p style="font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
            Thank you for creating an account on Jagriti. Please enter the verification code below in the signup form to complete your registration.
          </p>
          <div style="font-size: 32px; font-weight: 800; color: #0ea5e9; background-color: #f0f9ff; padding: 16px; text-align: center; border-radius: 12px; border: 1.5px dashed #bae6fd; letter-spacing: 6px; margin: 24px 0; font-family: monospace;">
            ${otp}
          </div>
          <p style="font-size: 11px; line-height: 1.5; color: #94a3b8; margin-top: 24px; border-t: 1px solid #f1f5f9; padding-top: 16px;">
            This verification code is valid for 5 minutes. If you did not make this request, you can safely ignore this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({
      status: 'success',
      message: 'Verification code sent to your email address successfully.'
    });
  } catch (err) {
    console.error('Failed to send email verification OTP:', err);
    return res.status(500).json({
      status: 'error',
      message: `Failed to dispatch email: ${err.message}`
    });
  }
};

exports.signup = async (req, res) => {
  const { username, name, surname, gender, mobileNumber, email, password, mobileOtp, emailOtp } = req.body;

  // Basic validation
  if (!username || !name || !surname || !gender || !mobileNumber || !email || !password || !mobileOtp || !emailOtp) {
    return res.status(400).json({ status: 'error', message: 'All registration parameters are required.' });
  }

  // 1. Verify mobile OTP
  const cachedMobile = otpStore[mobileNumber];
  if (!cachedMobile || cachedMobile.otp !== mobileOtp.toString() || cachedMobile.expires < Date.now()) {
    return res.status(400).json({ status: 'error', message: 'Invalid or expired mobile verification code.' });
  }

  // 2. Verify email OTP
  const cachedEmail = otpStore[email];
  if (!cachedEmail || cachedEmail.otp !== emailOtp.toString() || cachedEmail.expires < Date.now()) {
    return res.status(400).json({ status: 'error', message: 'Invalid or expired email verification code.' });
  }

  try {
    // Check conflicts
    const conflict = await User.findOne({
      where: {
        [User.sequelize.Sequelize.Op.or]: [
          { username },
          { email },
          { mobileNumber }
        ]
      }
    });

    if (conflict) {
      if (conflict.username === username) {
        return res.status(400).json({ status: 'error', message: 'Username is already taken.' });
      }
      if (conflict.email === email) {
        return res.status(400).json({ status: 'error', message: 'Email address is already registered.' });
      }
      if (conflict.mobileNumber === mobileNumber) {
        return res.status(400).json({ status: 'error', message: 'Mobile number is already registered.' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user record
    const user = await User.create({
      username,
      name,
      surname,
      gender,
      mobileNumber,
      email,
      password: hashedPassword
    });

    // Clean up used OTPs
    delete otpStore[mobileNumber];
    delete otpStore[email];

    // Generate JWT session token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'jagriti_fallback_secret', { expiresIn: '7d' });

    return res.status(201).json({
      status: 'success',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        surname: user.surname,
        email: user.email,
        mobileNumber: user.mobileNumber,
        gender: user.gender,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Failed user registration:', err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error during registration.' });
  }
};

exports.signin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ status: 'error', message: 'Invalid credentials. User does not exist.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: 'error', message: 'Invalid credentials. Incorrect password.' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'jagriti_fallback_secret', { expiresIn: '7d' });

    return res.status(200).json({
      status: 'success',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        surname: user.surname,
        email: user.email,
        mobileNumber: user.mobileNumber,
        gender: user.gender,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Failed user signin:', err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error during signin.' });
  }
};
