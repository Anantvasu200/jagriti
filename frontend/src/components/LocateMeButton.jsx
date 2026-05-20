import { Navigation } from 'lucide-react'

export default function LocateMeButton({ mapRef, userLocation, locationStatus }) {
  const locating = locationStatus === 'loading'

  const handleLocate = () => {
    const map = mapRef.current
    if (!map) return

    if (locationStatus === 'granted' && userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 15, { duration: 1.2 })
    } else if (locationStatus === 'denied') {
      alert('Location access is denied. Please enable it in browser settings to locate yourself on the map.')
    } else {
      alert('Acquiring location coordinates... Please wait a moment.')
    }
  }

  return (
    <button
      onClick={handleLocate}
      className={`
        absolute bottom-24 right-4 md:bottom-28 md:right-24 z-[1000]
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
