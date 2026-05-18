require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const { initializeDatabase } = require('./config/sequelize');
const incidentRoutes = require('./routes/incidentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Basic Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Jagriti API is running' });
});

// API Routes
app.use('/api/incidents', incidentRoutes);

// Terminal Logging Route
app.post('/api/log', (req, res) => {
  const { message, data } = req.body;
  console.log(`\n======================================================`);
  console.log(`🛎️  JAGRITI UI NOTIFICATION: ${message}`);
  
  if (data && Array.isArray(data) && data.length > 0) {
    console.log(`\n--- Filtered Incident Data ---`);
    data.forEach((inc, idx) => {
      console.log(`\n[${idx + 1}] ${inc.type.toUpperCase()} in ${inc.city || 'Unknown'}`);
      console.log(`    Date  : ${new Date(inc.date).toLocaleString()}`);
      console.log(`    Title : ${inc.title || 'No Title'}`);
      
      if (inc.sources && inc.sources.length > 0) {
         console.log(`    Source: ${inc.sources[0].sourceUrl}`);
      }
    });
  }
  
  console.log(`\n======================================================\n`);
  res.status(200).json({ status: 'success' });
});

// Start Server
const startServer = async () => {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
};

startServer();
