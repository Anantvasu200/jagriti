import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapView.css'

// Dummy crime data — baad mein API se aayega
const DUMMY_INCIDENTS = [
  { lat: 28.6139, lon: 77.2090, type: 'theft', city: 'Delhi' },
  { lat: 28.6200, lon: 77.2100, type: 'harassment', city: 'Delhi' },
  { lat: 28.5355, lon: 77.3910, type: 'assault', city: 'Noida' },
  { lat: 19.0760, lon: 72.8777, type: 'theft', city: 'Mumbai' },
  { lat: 19.0820, lon: 72.8900, type: 'harassment', city: 'Mumbai' },
  { lat: 12.9716, lon: 77.5946, type: 'theft', city: 'Bangalore' },
  { lat: 13.0827, lon: 80.2707, type: 'assault', city: 'Chennai' },
  { lat: 22.5726, lon: 88.3639, type: 'theft', city: 'Kolkata' },
  { lat: 17.3850, lon: 78.4867, type: 'harassment', city: 'Hyderabad' },
  { lat: 23.0225, lon: 72.5714, type: 'theft', city: 'Ahmedabad' },
  { lat: 26.8467, lon: 80.9462, type: 'assault', city: 'Lucknow' },
  { lat: 28.7041, lon: 77.1025, type: 'theft', city: 'Delhi North' },
  { lat: 28.4595, lon: 77.0266, type: 'harassment', city: 'Gurgaon' },
  { lat: 18.5204, lon: 73.8567, type: 'theft', city: 'Pune' },
  { lat: 21.1458, lon: 79.0882, type: 'assault', city: 'Nagpur' },
]

const CRIME_COLORS = {
  theft: '#f97316',
  harassment: '#ef4444',
  assault: '#dc2626',
  suspicious: '#eab308',
  other: '#94a3b8',
}

export default function MapView({ filters }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    // Init map only once
    if (mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [20.5937, 78.9629], // India center
      zoom: 5,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map)

    mapInstanceRef.current = map
  }, [])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []

    // Filter incidents
    const filtered = DUMMY_INCIDENTS.filter(inc =>
      filters.crimeType === 'all' || inc.type === filters.crimeType
    )

    // Add markers
    filtered.forEach(inc => {
      const color = CRIME_COLORS[inc.type] || CRIME_COLORS.other

      const marker = L.circleMarker([inc.lat, inc.lon], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.85,
      })

      marker.bindPopup(`
        <div style="font-family:sans-serif;min-width:160px">
          <strong style="color:${color}">${inc.type.toUpperCase()}</strong><br/>
          <span>📍 ${inc.city}</span>
        </div>
      `)

      marker.addTo(map)
      markersRef.current.push(marker)
    })
  }, [filters])

  return <div ref={mapRef} className="map-container" />
}