const { sequelize, Route, RouteSegment } = require('../models');
const { QueryTypes } = require('sequelize');
const axios = require('axios');
const polyline = require('@mapbox/polyline');

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

const suggest = async (req, res) => {
  try {
    const { startLat, startLon, endLat, endLon, transportMode } = req.body;
    if (!startLat || !startLon || !endLat || !endLon) {
      return res.status(400).json({ status: 'error', message: 'Missing start or end coordinates' });
    }

    const mode = transportMode || 'car';
    const profile = mode === 'walk' ? 'foot' : 'driving';
    
    // Attempt local docker first, then fallback to public OSRM API
    let osrmData;
    const OSRM_LOCAL_URL = process.env.OSRM_SERVICE_URL || 'http://osrm-backend:5000';
    const OSRM_PUBLIC_URL = 'https://router.project-osrm.org';
    
    try {
      const url = `${OSRM_LOCAL_URL}/route/v1/${profile}/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&alternatives=true&steps=true`;
      const response = await axios.get(url, { timeout: 4000 });
      osrmData = response.data;
      console.log('Route suggestion retrieved from local OSRM container.');
    } catch (localErr) {
      console.warn('Local OSRM down or timed out. Falling back to public OSRM API...', localErr.message);
      const url = `${OSRM_PUBLIC_URL}/route/v1/${profile}/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&alternatives=true&steps=true`;
      const response = await axios.get(url);
      osrmData = response.data;
    }

    if (osrmData.code !== 'Ok' || !osrmData.routes || osrmData.routes.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No routes found to the destination.' });
    }

    const evaluatedRoutes = await Promise.all(osrmData.routes.map(async (route, idx) => {
      const coords = route.geometry.coordinates; // arrays of [lng, lat]
      
      const segments = [];
      const SEGMENT_SIZE = 50;
      
      for (let i = 0; i < coords.length - 1; i += SEGMENT_SIZE) {
        const segPoints = coords.slice(i, Math.min(i + SEGMENT_SIZE + 1, coords.length));
        if (segPoints.length < 2) continue;
        
        const lineStringCoords = segPoints.map(p => `${p[0]} ${p[1]}`).join(', ');
        const lineStringSql = `ST_GeomFromText('LINESTRING(${lineStringCoords})', 4326)`;
        
        const [scoreResult] = await sequelize.query(`
          SELECT 
            calculate_line_safety_score(${lineStringSql}) as score,
            (SELECT COUNT(*) FROM incidents 
             WHERE ST_DWithin(location::geography, ${lineStringSql}::geography, 500)
             AND date > NOW() - INTERVAL '180 days') as count
        `);
        
        const safetyScore = scoreResult[0] ? parseFloat(scoreResult[0].score) : 10.0;
        const incidentCount = scoreResult[0] ? parseInt(scoreResult[0].count) : 0;
        
        let colorCode = 'green';
        if (safetyScore < 5.0) colorCode = 'red';
        else if (safetyScore < 8.0) colorCode = 'yellow';
        
        segments.push({
          coordinates: segPoints.map(p => [p[1], p[0]]), // convert back to [lat, lng] for frontend polyline
          safetyScore: Math.round(safetyScore * 10.0), // convert 1-10 to 10-100%
          colorCode,
          incidentsNearby: incidentCount
        });
      }
      
      const averageScorePercentage = Math.round(
        segments.reduce((sum, s) => sum + s.safetyScore, 0) / segments.length
      );
      
      const tollBoothsCount = Math.floor(route.distance / 80000); // approx 1 toll plaza per 80km
      
      return {
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration,
        safetyScore: averageScorePercentage,
        hotspotCount: segments.reduce((sum, s) => sum + s.incidentsNearby, 0),
        segments,
        tollBooths: Array(tollBoothsCount).fill({ name: 'NHAI Toll Plaza' })
      };
    }));

    // Sort: Safest path first
    evaluatedRoutes.sort((a, b) => b.safetyScore - a.safetyScore);

    // Save safest route record
    const safest = evaluatedRoutes[0];
    const encodedPoly = polyline.encode(safest.geometry.coordinates.map(c => [c[1], c[0]]));
    
    const dbRoute = await Route.create({
      start_point: { type: 'Point', coordinates: [startLon, startLat] },
      end_point: { type: 'Point', coordinates: [endLon, endLat] },
      total_distance: safest.distance,
      total_duration: safest.duration,
      overall_safety_score: safest.safetyScore,
      polyline_encoded: encodedPoly,
      has_tolls: safest.tollBooths.length > 0,
      nearby_facilities: {}
    });

    const segmentData = safest.segments.map((seg, idx) => ({
      route_id: dbRoute.id,
      segment_index: idx,
      geom: { type: 'LineString', coordinates: seg.coordinates.map(c => [c[1], c[0]]) },
      safety_score: seg.safetyScore,
      color_code: seg.colorCode,
      incidents_nearby: seg.incidentsNearby
    }));
    await RouteSegment.bulkCreate(segmentData);

    res.status(200).json({
      status: 'success',
      routes: evaluatedRoutes
    });

  } catch (error) {
    console.error('Error during route suggestion:', error);
    res.status(500).json({ status: 'error', message: 'Failed to suggest safe routes' });
  }
};

module.exports = {
  safetyCheck,
  tollEstimate,
  suggest
};
