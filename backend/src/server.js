const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const { initializeDatabase } = require('./config/sequelize');
const { initSocket } = require('./config/socket');
const incidentRoutes = require('./routes/incidentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const publicV1Routes = require('./routes/publicV1Routes');
const apiDeveloperRoutes = require('./routes/apiDeveloperRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const routeRoutes = require('./routes/routeRoutes');


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.set('trust proxy', 1)
app.use(cors());
express.json({ limit: '10mb' })

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api/', limiter);

// Basic Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Jagriti API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/v1', publicV1Routes);
app.use('/api/developer', apiDeveloperRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/routes', routeRoutes);

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

// Create HTTP server wrapping Express app
const server = http.createServer(app);

// Initialize WebSockets
initSocket(server);

// Start Server
const startServer = async () => {
  await initializeDatabase();
  
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
};

startServer();

