const { Sequelize } = require('sequelize');
const config = require('./database.js')[process.env.NODE_ENV || 'development'];
const logger = require('./logger');
const bcrypt = require('bcryptjs');

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
    const { Incident, IncidentSource, CommunityReport, SafetyScore, User } = require('../models');
    await sequelize.sync({ alter: true });
    logger.info('Database models synced successfully.');

    // Seed default administrator if none exists
    const adminExists = await User.findOne({ where: { role: 'admin' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('adminpassword', 10);
      await User.create({
        username: 'admin',
        name: 'System',
        surname: 'Admin',
        gender: 'Other',
        mobileNumber: '+910000000000',
        email: 'admin@jagriti.org',
        password: hashedPassword,
        role: 'admin'
      });
      logger.info('Default admin seeded successfully: admin@jagriti.org / adminpassword');
    }
  } catch (err) {
    logger.error('Unable to connect to the database:', err);
  }
};

module.exports = { sequelize, initializeDatabase };
