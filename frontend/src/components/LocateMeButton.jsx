import { useState } from 'react'
import L from 'leaflet'
import { Navigation } from 'lucide-react'

export default function LocateMeButton({ mapRef }) {
  const [locating, setLocating] = useState(false)

  const handleLocate = () => {
    const map = mapRef.current
    if (!map) return

    setLocating(true)
    
    // Leaflet's built-in locate method
    map.locate({ setView: true, maxZoom: 14, duration: 1.5 })
    
    map.once('locationfound', (e) => {
      setLocating(false)
      // Optional: Add a subtle pulse or circle at user's location
      // Using a simple circle marker for now
      L.circleMarker(e.latlng, {
        radius: 6,
        fillColor: '#3b82f6', // Blue to stand out from crimes
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 1
      }).addTo(map).bindPopup("You are here").openPopup()
    })

    map.once('locationerror', (e) => {
      setLocating(false)
      alert(e.message || 'Unable to retrieve your location')
    })
  }

  return (
    <button
      onClick={handleLocate}
      disabled={locating}
      className={`
        absolute bottom-28 right-24 z-[1000]
        w-12 h-12 rounded-full flex items-center justify-center
        bg-slate-900 border border-white/10
        shadow-[0_8px_32px_rgba(0,0,0,0.4)]
        text-slate-300 hover:text-white hover:bg-slate-800
        transition-all duration-300
        ${locating ? 'animate-pulse text-blue-400' : ''}
      `}
      title="Go to my location"
    >
      <Navigation size={20} className={locating ? 'animate-bounce' : ''} />
    </button>
  )
}
