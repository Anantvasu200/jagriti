import { useState, useRef } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import Globe3DDemo from './components/3d-globe-demo'

function App() {
  const mapInstanceRef = useRef(null)
  const [filters, setFilters] = useState({
    crimeType: 'all',
    startDate: '',
    endDate: '',
    dataSource: 'both',
    searchTrigger: 0 // To detect when "Go" is pressed
  })

  const [notification, setNotification] = useState(null)

  const showNotification = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden font-sans text-slate-200">
      
      {/* ── Toast Notification ─────────────────────────────────────── */}
      <div className={`
        absolute top-4 left-1/2 -translate-x-1/2 z-[2000]
        transition-all duration-300 ease-out
        ${notification ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}
      `}>
        <div className="bg-emerald-500/90 text-emerald-50 px-4 py-2 rounded-full shadow-lg border border-emerald-400/50 text-sm font-medium backdrop-blur-md">
          {notification}
        </div>
      </div>

      {/* ── Floating Header ─────────────────────────────────────────── */}
      <header className="
        absolute top-4 left-4 z-[1000]
        flex items-center gap-3
      ">
        {/* Logo container with glow */}
        <div className="
          relative flex items-center justify-center
          w-16 h-16 shrink-0 rounded-full overflow-hidden
          shadow-[0_0_15px_rgba(14,165,233,0.4)]
          bg-slate-900
        ">
          <Globe3DDemo />
        </div>

        {/* Brand name & Tagline */}
        <div className="flex flex-col leading-none gap-1.5 mr-2">
          <h1 className="
            text-[1.8rem] font-black tracking-tight leading-none
            bg-gradient-to-r from-slate-950 via-slate-800 to-cyan-700 bg-clip-text text-transparent
            drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]
          ">
            Jagriti
          </h1>
          <p className="text-[0.55rem] font-extrabold text-slate-500 tracking-[0.12em] uppercase">
            Know Your Surroundings. Stay Safe.
          </p>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200 mx-2" />

        {/* Search Bar */}
        <SearchBar mapRef={mapInstanceRef} />
      </header>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <Sidebar filters={filters} setFilters={setFilters} />
        <MapView filters={filters} showNotification={showNotification} mapInstanceRef={mapInstanceRef} />
      </div>
    </div>
  )
}

export default App