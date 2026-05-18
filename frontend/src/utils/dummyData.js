// Major cities coordinates
const CITIES = {
  Delhi: { lat: 28.6139, lon: 77.2090 },
  Mumbai: { lat: 19.0760, lon: 72.8777 },
  Bangalore: { lat: 12.9716, lon: 77.5946 },
  Pune: { lat: 18.5204, lon: 73.8567 },
  Hyderabad: { lat: 17.3850, lon: 78.4867 },
  Chennai: { lat: 13.0827, lon: 80.2707 },
  Kolkata: { lat: 22.5726, lon: 88.3639 },
};

const CRIME_TYPES = ['theft', 'harassment', 'assault', 'suspicious'];

const generateMockData = (count) => {
  const data = [];
  const cityNames = Object.keys(CITIES);
  
  for (let i = 0; i < count; i++) {
    const city = cityNames[Math.floor(Math.random() * cityNames.length)];
    const center = CITIES[city];
    
    // Add random jitter to coordinates (roughly up to ~15km radius)
    const latJitter = (Math.random() - 0.5) * 0.2;
    const lonJitter = (Math.random() - 0.5) * 0.2;
    
    const type = CRIME_TYPES[Math.floor(Math.random() * CRIME_TYPES.length)];
    
    // Random date within the last 30 days
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    
    data.push({
      id: `inc_${i}`,
      lat: center.lat + latJitter,
      lon: center.lon + lonJitter,
      type: type,
      city: city,
      date: date.toISOString(),
      description: `Reported incident of ${type} in ${city} area.`
    });
  }
  
  return data;
};

export const DUMMY_INCIDENTS = generateMockData(150);
