const { Sequelize } = require('sequelize');
const config = require('./database.js')[process.env.NODE_ENV || 'development'];
const logger = require('./logger');

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: msg => logger.debug(msg),
  ...config
});

// Auto-enable PostGIS extension
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
    
    // Enable PostGIS extension if it doesn't exist
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    logger.info('PostGIS extension verified.');

    // Sync models
    const { Incident, IncidentSource, CommunityReport, SafetyScore } = require('../models');
    await sequelize.sync({ alter: true });
    logger.info('Database models synced successfully.');
  } catch (err) {
    logger.error('Unable to connect to the database:', err);
  }
};

module.exports = { sequelize, initializeDatabase };
