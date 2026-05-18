const { Incident, IncidentSource, CommunityReport } = require('../models');
const logger = require('../config/logger');

// Get incidents (can be filtered by bounding box in the future)
const getIncidents = async (req, res) => {
  try {
    const { type } = req.query;
    
    let whereClause = {};
    
    if (type && type !== 'all') {
      whereClause.type = type;
    }

    const incidents = await Incident.findAll({
      where: whereClause,
      limit: 1000,
      order: [['date', 'DESC']],
      include: [
        { model: IncidentSource, as: 'sources' }
      ]
    });
    res.status(200).json({ status: 'success', data: incidents });
  } catch (error) {
    logger.error('Error fetching incidents:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch incidents' });
  }
};

// Create a new incident
const createIncident = async (req, res) => {
  try {
    const { title, description, type, date, lat, lng, city } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ status: 'error', message: 'Latitude and Longitude are required' });
    }

    const newIncident = await Incident.create({
      title,
      description,
      type,
      date: date || new Date(),
      location: { type: 'Point', coordinates: [lng, lat] }, // PostGIS expects [longitude, latitude]
      city
    });

    res.status(201).json({ status: 'success', data: newIncident });
  } catch (error) {
    logger.error('Error creating incident:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create incident' });
  }
};

// Community Reporting Endpoints
const reportCommunityIncident = async (req, res) => {
  try {
    const { title, description, type, lat, lng, city, userId } = req.body;

    if (!lat || !lng || !userId) {
      return res.status(400).json({ status: 'error', message: 'Lat, Lng, and userId are required' });
    }

    const newIncident = await Incident.create({
      title: title || `Community Reported ${type}`,
      description,
      type,
      date: new Date(),
      location: { type: 'Point', coordinates: [lng, lat] },
      city,
      isVerified: false,
      source: 'community',
      confirmations: 1
    });

    await CommunityReport.create({
      incidentId: newIncident.id,
      reportDetails: description,
      userId
    });

    res.status(201).json({ status: 'success', data: newIncident, message: 'Incident reported successfully. Requires 2 more confirmations to be verified.' });
  } catch (error) {
    logger.error('Error reporting community incident:', error);
    res.status(500).json({ status: 'error', message: 'Failed to report incident' });
  }
};

const confirmCommunityIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const incident = await Incident.findByPk(id);
    if (!incident) {
      return res.status(404).json({ status: 'error', message: 'Incident not found' });
    }

    // Check if user already confirmed
    const existingReport = await CommunityReport.findOne({
      where: { incidentId: id, userId }
    });

    if (existingReport) {
      return res.status(400).json({ status: 'error', message: 'You have already confirmed this incident.' });
    }

    // Add confirmation
    await CommunityReport.create({
      incidentId: id,
      userId
    });

    incident.confirmations += 1;
    if (incident.confirmations >= 3) {
      incident.isVerified = true;
    }
    
    await incident.save();

    res.status(200).json({ 
      status: 'success', 
      data: incident,
      message: incident.isVerified ? 'Incident verified!' : `Confirmed. Needs ${3 - incident.confirmations} more.`
    });
  } catch (error) {
    logger.error('Error confirming incident:', error);
    res.status(500).json({ status: 'error', message: 'Failed to confirm incident' });
  }
};

module.exports = {
  getIncidents,
  createIncident,
  reportCommunityIncident,
  confirmCommunityIncident
};
