const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

// Evaluate safety along a route geometry (GeoJSON LineString)
const safetyCheck = async (req, res) => {
  try {
    const { routeGeometry, transportMode } = req.body;
    if (!routeGeometry) {
      return res.status(400).json({ status: 'error', message: 'routeGeometry is required' });
    }

    // Run PostGIS query to find all incidents within 500m of the route
    const incidents = await sequelize.query(
      `SELECT id, type, title, description, date, 
              ST_Y(location::geometry) as lat, 
              ST_X(location::geometry) as lng
       FROM incidents
       WHERE ST_DWithin(
         location::geography,
         ST_SetSRID(ST_GeomFromGeoJSON(:routeGeometry), 4326)::geography,
         500
       )`,
      {
        replacements: { routeGeometry: JSON.stringify(routeGeometry) },
        type: QueryTypes.SELECT
      }
    );

    // Calculate safety score (start at 100, deduct based on incident types)
    let safetyScore = 100;
    const hotspotCount = incidents.length;

    incidents.forEach(inc => {
      if (inc.type === 'assault') safetyScore -= 15;
      else if (inc.type === 'harassment') safetyScore -= 10;
      else if (inc.type === 'suspicious') safetyScore -= 5;
      else if (inc.type === 'theft') safetyScore -= 3;
      else safetyScore -= 2;
    });

    safetyScore = Math.max(5, Math.min(100, safetyScore)); // minimum safety score of 5%

    // Cluster dangerous areas (~110m grid) to avoid listing redundant points
    const clusters = {};
    incidents.forEach(inc => {
      const latRounded = Math.round(inc.lat * 1000) / 1000;
      const lngRounded = Math.round(inc.lng * 1000) / 1000;
      const key = `${latRounded},${lngRounded}`;
      if (!clusters[key]) {
        clusters[key] = {
          lat: inc.lat,
          lng: inc.lng,
          crimeType: inc.type,
          count: 0
        };
      }
      clusters[key].count += 1;
    });
    const dangerousAreas = Object.values(clusters);

    // Calculate which parts of the route are within 500m of any incident
    const haversineDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371000; // meters
      const phi1 = lat1 * Math.PI / 180;
      const phi2 = lat2 * Math.PI / 180;
      const deltaPhi = (lat2 - lat1) * Math.PI / 180;
      const deltaLambda = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                Math.cos(phi1) * Math.cos(phi2) *
                Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const hotspotSegments = [];
    if (routeGeometry && routeGeometry.coordinates) {
      routeGeometry.coordinates.forEach(coord => {
        const [lng, lat] = coord;
        const isNear = incidents.some(inc => haversineDistance(lat, lng, inc.lat, inc.lng) <= 500);
        if (isNear) {
          hotspotSegments.push([lng, lat]);
        }
      });
    }

    res.status(200).json({
      status: 'success',
      safetyScore,
      hotspotCount,
      hotspotSegments,
      dangerousAreas
    });
  } catch (error) {
    console.error('Error during safety check:', error);
    res.status(500).json({ status: 'error', message: 'Failed to evaluate route safety' });
  }
};

// Calculate NHAI average toll estimate ranges based on mode and toll booth count
const tollEstimate = async (req, res) => {
  try {
    const mode = req.query.mode || 'car';
    const count = parseInt(req.query.count) || 0;

    if (count === 0) {
      return res.status(200).json({
        min: 0,
        max: 0,
        formatted: '₹0'
      });
    }

    let minRate = 0;
    let maxRate = 0;

    switch (mode.toLowerCase()) {
      case 'walk':
      case 'foot':
        minRate = 0;
        maxRate = 0;
        break;
      case 'bike':
      case 'bicycle':
      case 'motorcycle':
        minRate = 35;
        maxRate = 75;
        break;
      case 'truck':
      case 'heavy':
        minRate = 155;
        maxRate = 310;
        break;
      case 'car':
      default:
        minRate = 75;
        maxRate = 155;
        break;
    }

    const min = minRate * count;
    const max = maxRate * count;

    res.status(200).json({
      min,
      max,
      formatted: min === 0 ? '₹0' : `₹${min}–₹${max}`
    });
  } catch (error) {
    console.error('Error calculating toll estimate:', error);
    res.status(500).json({ status: 'error', message: 'Failed to calculate toll estimate' });
  }
};

module.exports = {
  safetyCheck,
  tollEstimate
};
