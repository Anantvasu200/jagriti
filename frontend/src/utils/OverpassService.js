/**
 * Overpass API Service to fetch nearby safe spots
 * Categories: Police, Hospitals/Clinics, Pharmacies/Chemists, Metro Stations, Petrol/CNG Pumps, EV Charging Stations
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Memory cache for safe spots query results
const safeSpotsCache = new Map();

export async function fetchSafeSpots(bounds) {
  if (!bounds) return [];

  const sw = bounds._southWest || bounds.getSouthWest();
  const ne = bounds._northEast || bounds.getNorthEast();

  // Create a cache key by rounding coordinate bounds to 4 decimal places (~11m accuracy)
  // This reduces duplicate network calls when map is moved or zoomed slightly
  const cacheKey = `${sw.lat.toFixed(4)},${sw.lng.toFixed(4)},${ne.lat.toFixed(4)},${ne.lng.toFixed(4)}`;

  if (safeSpotsCache.has(cacheKey)) {
    console.log('[Overpass Caching] Returning cached safe spots for bbox:', cacheKey);
    return safeSpotsCache.get(cacheKey);
  }

  const bbox = `${sw.lat},${sw.lng},${ne.lat},${ne.lng}`;

  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="police"](${bbox});
      way["amenity"="police"](${bbox});
      node["amenity"~"hospital|clinic|doctors"](${bbox});
      way["amenity"~"hospital|clinic|doctors"](${bbox});
      node["amenity"="pharmacy"](${bbox});
      way["amenity"="pharmacy"](${bbox});
      node["shop"~"chemist|pharmacy"](${bbox});
      way["shop"~"chemist|pharmacy"](${bbox});
      node["railway"~"subway|station"](${bbox});
      node["amenity"="fuel"](${bbox});
      way["amenity"="fuel"](${bbox});
      node["amenity"="charging_station"](${bbox});
      way["amenity"="charging_station"](${bbox});
    );
    out center;
  `;

  try {
    const response = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Overpass query failed');
    const data = await response.json();
    
    if (!data.elements) return [];

    const results = [];
    data.elements.forEach(el => {
      const isNode = el.type === 'node';
      const lat = isNode ? el.lat : (el.center ? el.center.lat : null);
      const lng = isNode ? el.lon : (el.center ? el.center.lon : null);

      if (lat === null || lat === undefined || lng === null || lng === undefined) {
        return;
      }

      // Classify amenity types
      let type = 'other';
      let typeLabel = 'Safe Zone';
      if (el.tags.amenity === 'police') {
        type = 'police';
        typeLabel = 'Police Station/Chowki';
      } else if (el.tags.amenity === 'hospital' || el.tags.amenity === 'clinic' || el.tags.amenity === 'doctors') {
        type = 'hospital';
        typeLabel = 'Hospital/Clinic';
      } else if (el.tags.amenity === 'pharmacy' || el.tags.shop === 'chemist' || el.tags.shop === 'pharmacy') {
        type = 'pharmacy';
        typeLabel = 'Chemist Shop';
      } else if (el.tags.railway === 'subway' || el.tags.railway === 'station') {
        type = 'metro';
        typeLabel = 'Metro Station';
      } else if (el.tags.amenity === 'fuel') {
        type = 'fuel';
        typeLabel = 'Petrol/CNG Pump';
      } else if (el.tags.amenity === 'charging_station') {
        type = 'ev_charging';
        typeLabel = 'EV Charging Station';
      }

      // Format description/details
      const street = el.tags['addr:street'] || el.tags['addr:full'] || '';
      const suburb = el.tags['addr:suburb'] || el.tags['addr:subdivision'] || '';
      const address = [street, suburb].filter(Boolean).join(', ') || typeLabel;

      results.push({
        id: el.id,
        lat,
        lng,
        name: el.tags.name || el.tags.operator || `Nearby ${typeLabel}`,
        type,
        details: address
      });
    });

    safeSpotsCache.set(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Failed to query Overpass API:', error);
    return [];
  }
}
