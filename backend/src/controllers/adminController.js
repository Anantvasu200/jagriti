const { User, Incident, IncidentSource } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');

const getAdminMetrics = async (req, res) => {
  try {
    // 1. Fetch Users Data
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    const totalUsers = users.length;
    const maleCount = users.filter(u => u.gender.toLowerCase() === 'male').length;
    const femaleCount = users.filter(u => u.gender.toLowerCase() === 'female').length;
    const otherCount = users.filter(u => u.gender.toLowerCase() === 'other').length;

    // 2. Fetch Incidents Data
    const incidents = await Incident.findAll({
      include: [{ model: IncidentSource, as: 'sources' }],
      order: [['createdAt', 'DESC']]
    });

    const verifiedIncidents = incidents.filter(i => i.isVerified || i.source === 'ncrb');
    const totalIncidents = verifiedIncidents.length;

    // Source Distribution
    const ncrbCount = verifiedIncidents.filter(i => i.source === 'ncrb').length;
    const nlpCount = verifiedIncidents.filter(i => i.source === 'nlp').length;
    const communityCount = verifiedIncidents.filter(i => i.source === 'community').length;

    // Type Distribution
    const typeDistribution = {
      theft: verifiedIncidents.filter(i => i.type === 'theft').length,
      harassment: verifiedIncidents.filter(i => i.type === 'harassment').length,
      assault: verifiedIncidents.filter(i => i.type === 'assault').length,
      suspicious: verifiedIncidents.filter(i => i.type === 'suspicious').length,
      other: verifiedIncidents.filter(i => i.type === 'other').length,
    };

    // Today's Scrapes
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayScrapedCount = verifiedIncidents.filter(i => new Date(i.createdAt) >= startOfToday).length;

    // 3. Trends Aggregation (Day-by-Day)
    // We group by YYYY-MM-DD for both Scrape Date (createdAt) and Newspaper Publish Date (date)
    const scrapTrend = {};
    const publishTrend = {};

    verifiedIncidents.forEach(inc => {
      // Scrape Date
      const cDateStr = new Date(inc.createdAt).toISOString().split('T')[0];
      scrapTrend[cDateStr] = (scrapTrend[cDateStr] || 0) + 1;

      // Newspaper Publish Date
      const pDateStr = new Date(inc.date).toISOString().split('T')[0];
      publishTrend[pDateStr] = (publishTrend[pDateStr] || 0) + 1;
    });

    // Format trends as sorted arrays of { date, count }
    const formatTrend = (trendObj) => {
      return Object.keys(trendObj)
        .map(date => ({ date, count: trendObj[date] }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30); // Limit to last 30 active days
    };

    res.status(200).json({
      status: 'success',
      data: {
        users: {
          total: totalUsers,
          male: maleCount,
          female: femaleCount,
          other: otherCount,
          list: users
        },
        incidents: {
          total: totalIncidents,
          ncrb: ncrbCount,
          nlp: nlpCount,
          community: communityCount,
          todayScraped: todayScrapedCount,
          typeBreakdown: typeDistribution,
          list: incidents
        },
        trends: {
          scrapes: formatTrend(scrapTrend),
          publications: formatTrend(publishTrend)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching admin dashboard metrics:', error);
    res.status(500).json({ status: 'error', message: 'Failed to aggregate administrative metrics.' });
  }
};

const verifyIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await Incident.findByPk(id);
    if (!incident) {
      return res.status(404).json({ status: 'error', message: 'Incident not found.' });
    }
    incident.isVerified = true;
    if (incident.confidence_score !== null && incident.confidence_score < 0.5) {
      incident.confidence_score = 1.0;
    }
    await incident.save();
    res.status(200).json({ status: 'success', message: 'Incident location verified successfully!' });
  } catch (error) {
    logger.error('Error verifying incident:', error);
    res.status(500).json({ status: 'error', message: 'Failed to verify incident.' });
  }
};

module.exports = {
  getAdminMetrics,
  verifyIncident
};
