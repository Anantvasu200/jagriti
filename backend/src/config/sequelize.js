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
    const { Incident, IncidentSource, CommunityReport, SafetyScore, User, SubLocality, Route, RouteSegment } = require('../models');
    await sequelize.sync({ alter: true });
    logger.info('Database models synced successfully.');

    // Create safety scoring PostGIS function
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION calculate_line_safety_score(line_geom GEOMETRY(LINESTRING, 4326))
      RETURNS FLOAT AS $$
      DECLARE
          total_score FLOAT := 10.0;
          segment_length FLOAT;
          incident_count INT;
          recent_weight FLOAT;
          severity_weight FLOAT;
      BEGIN
          segment_length := ST_Length(line_geom::GEOGRAPHY) / 1000.0;
          IF segment_length = 0 THEN
              segment_length := 0.01;
          END IF;
          
          SELECT 
              COUNT(*),
              COALESCE(AVG(CASE 
                  WHEN type = 'assault' THEN 3.0
                  WHEN type = 'harassment' THEN 2.0
                  WHEN type = 'suspicious' THEN 1.5
                  WHEN type = 'theft' THEN 1.0
                  ELSE 1.0 END), 1.0)
          INTO incident_count, severity_weight
          FROM incidents
          WHERE ST_DWithin(
              location::geography,
              line_geom::geography,
              500
          )
          AND date > NOW() - INTERVAL '180 days';
          
          SELECT COALESCE(AVG(
              CASE 
                  WHEN date > NOW() - INTERVAL '7 days' THEN 3.0
                  WHEN date > NOW() - INTERVAL '30 days' THEN 2.0
                  ELSE 1.0 END
          ), 1.0)
          INTO recent_weight
          FROM incidents
          WHERE ST_DWithin(
              location::geography,
              line_geom::geography,
              500
          )
          AND date > NOW() - INTERVAL '180 days';
          
          total_score := 10.0 - (incident_count * severity_weight * recent_weight / (segment_length + 1.0));
          
          RETURN GREATEST(1.0, LEAST(10.0, total_score));
      END;
      $$ LANGUAGE plpgsql;
    `);
    logger.info('PostGIS safety scoring function calculate_line_safety_score registered/updated.');

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
