/**
 * Overpass API Service to fetch nearby safe spots (Police, Hospitals, Pharmacies, Metro Stations)
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export async function fetchSafeSpots(bounds) {
  if (!bounds) return [];

  const sw = bounds._southWest || bounds.getSouthWest();
  const ne = bounds._northEast || bounds.getNorthEast();

  // Overpass bbox format: (minlat, minlon, maxlat, maxlon)
  const bbox = `${sw.lat},${sw.lng},${ne.lat},${ne.lng}`;

  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="police"](${bbox});
      way["amenity"="police"](${bbox});
      node["amenity"="hospital"](${bbox});
      way["amenity"="hospital"](${bbox});
      node["amenity"="pharmacy"](${bbox});
      way["amenity"="pharmacy"](${bbox});
      node["railway"="subway"](${bbox});
      node["railway"="station"](${bbox});
    );
    out center;
  `;

  try {
    const response = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Overpass query failed');
    const data = await response.json();
    
    if (!data.elements) return [];

    return data.elements.map(el => {
      const isNode = el.type === 'node';
      const lat = isNode ? el.lat : el.center.lat;
      const lng = isNode ? el.lon : el.center.lng;

      // Classify amenity types
      let type = 'other';
      if (el.tags.amenity === 'police') type = 'police';
      else if (el.tags.amenity === 'hospital') type = 'hospital';
      else if (el.tags.amenity === 'pharmacy') type = 'pharmacy';
      else if (el.tags.railway === 'subway' || el.tags.railway === 'station') type = 'metro';

      return {
        id: el.id,
        lat,
        lng,
        name: el.tags.name || el.tags.operator || `Nearby ${type}`,
        type,
        details: el.tags['addr:street'] || el.tags['addr:full'] || 'Safe Zone'
      };
    });
  } catch (error) {
    console.error('Failed to query Overpass API:', error);
    return [];
  }
}
