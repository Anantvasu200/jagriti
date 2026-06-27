import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import Globe3DDemo from './components/3d-globe-demo'
import SosButton from './components/SosButton'
import SosWarningBanner from './components/SosWarningBanner'
import socket from './utils/socket'
import alarmGenerator from './utils/SosAlarmGenerator'
import AnonymousTipModal from './components/AnonymousTipModal'
import AuthModal from './components/AuthModal'
import AdminGate from './components/AdminGate'
import AdminDashboard from './components/AdminDashboard'
import { LocationProcessor } from './utils/locationService'
import { API_BASE_URL } from './utils/apiConfig'

function App() {
  const { i18n } = useTranslation()
  const mapInstanceRef = useRef(null)
  const [filters, setFilters] = useState({
    crimeType: 'all',
    startDate: '',
    endDate: '',
    dataSource: 'live', // Keep "Live RSS" as default selected data source
    searchTrigger: 0, // To detect when "Go" is pressed
    onlyWomenSafety: false,
    timeOfDay: 'all', // all, day, night
    safeSpotsRadius: 1000 // default range 1km (1000m)
  })

  const [notification, setNotification] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('loading') // loading, granted, denied, error
  const [locationError, setLocationError] = useState(null)
  
  // Independent Location Sharing Feature State
  const [isSharingLocation, setIsSharingLocation] = useState(false)

  // Centralized SOS Panic States
  const [activeSOS, setActiveSOS] = useState(false)
  const [sosCountdown, setSosCountdown] = useState(null)
  const [showSosModal, setShowSosModal] = useState(false)
  const [sosType, setSosType] = useState('assault')
  const [sosCoords, setSosCoords] = useState(null)

  // Routing feature states
  const [showRoutePlanner, setShowRoutePlanner] = useState(false)
  const [fromLocation, setFromLocation] = useState(null) // { lat, lng, label }
  const [routeDestination, setRouteDestination] = useState(null) // { lat, lng, label }
  const [routesData, setRoutesData] = useState([])
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [transportMode, setTransportMode] = useState('car')
  const [language, setLanguage] = useState('en') // 'en' or 'hi'
  
  // Anonymous Tip States
  const [showAnonymousTipModal, setShowAnonymousTipModal] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // User Auth States
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState('login')
  const [currentUser, setCurrentUser] = useState(null)
  const [safeSpots, setSafeSpots] = useState([])
  const [loadingSafeSpots, setLoadingSafeSpots] = useState(false)

  // Client Routing path state
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  // Listen to popstate event for routing
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname)
    }
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  const navigateTo = (path) => {
    window.history.pushState({}, '', path)
    setCurrentPath(path)
  }

  const sosCountdownIntervalRef = useRef(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Get or create unique user ID
  const getUserId = () => {
    let id = localStorage.getItem('jagriti_user_id')
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 15)
      localStorage.setItem('jagriti_user_id', id)
    }
    return id
  }

  const locationProcessorRef = useRef(null)
  if (!locationProcessorRef.current) {
    locationProcessorRef.current = new LocationProcessor()
  }

  // --- Load Saved Session User & Language ---
  useEffect(() => {
    const saved = localStorage.getItem('jagriti_user')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setCurrentUser(parsed)
        if (parsed.language) {
          setLanguage(parsed.language)
        }
      } catch (e) {
        localStorage.removeItem('jagriti_user')
      }
    }
  }, [])

  // --- Synchronize Language Preference ---
  useEffect(() => {
    i18n.changeLanguage(language)
    localStorage.setItem('jagriti_language', language)
    if (currentUser) {
      const token = localStorage.getItem('jagriti_token')
      if (token) {
        fetch(`${API_BASE_URL}/api/auth/settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ language })
        })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            const updatedUser = { ...currentUser, language: data.user.language }
            setCurrentUser(updatedUser)
            localStorage.setItem('jagriti_user', JSON.stringify(updatedUser))
          }
        })
        .catch(err => console.error('Failed to sync language to backend settings:', err))
      }
    }
  }, [language, currentUser?.id])

  // --- Check URL Path Routing for direct Signin/Signup ---
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/signin' || path === '/login') {
      setAuthModalMode('login');
      setShowAuthModal(true);
      navigateTo('/');
    } else if (path === '/signup' || path === '/register') {
      setAuthModalMode('signup');
      setShowAuthModal(true);
      navigateTo('/');
    }
  }, []);

  // --- Geolocation Watcher with Kalman Filter & Smoothing ---
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('denied')
      setLocationError('Geolocation is not supported by this browser.')
      return
    }

    setLocationStatus('loading')

    const handleSuccess = (position) => {
      const processed = locationProcessorRef.current.process(position)
      if (processed) {
        setUserLocation(processed)
        setLocationStatus('granted')
        setLocationError(null)
      }
    }

    const handleError = (error) => {
      console.warn("Global geolocation watch error:", error)
      if (error.code === error.PERMISSION_DENIED) {
        setLocationStatus('denied')
        setLocationError('Location access was denied. Please enable it in browser settings to use safety features.')
      } else {
        setLocationStatus('error')
        setLocationError(error.message || 'Unable to retrieve location.')
      }
    }

    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // --- Independent Location Sharing Signals ---
  useEffect(() => {
    const userId = getUserId()
    if (isSharingLocation && userLocation) {
      socket.emit('sharing:start', { 
        userId, 
        lat: userLocation.lat, 
        lng: userLocation.lng,
        accuracy: userLocation.accuracy,
        confidence: userLocation.confidence,
        isStable: userLocation.isStable
      })
    } else if (!isSharingLocation) {
      socket.emit('sharing:stop', { userId })
    }
  }, [isSharingLocation])

  useEffect(() => {
    const userId = getUserId()
    if (isSharingLocation && userLocation) {
      socket.emit('sharing:update_location', { 
        userId, 
        lat: userLocation.lat, 
        lng: userLocation.lng,
        accuracy: userLocation.accuracy,
        confidence: userLocation.confidence,
        isStable: userLocation.isStable
      })
    }
  }, [userLocation, isSharingLocation])

  // --- SOS Panic Beacon Signals & Routines ---
  const handleSosClick = () => {
    if (activeSOS) {
      resolveSOS()
    } else {
      if (locationStatus === 'denied') {
        alert("🚨 Location Access Denied: Jagriti requires location access to trigger an SOS alert. Please allow location permissions in your browser/system settings.")
      } else if (locationStatus === 'error' && locationError) {
        alert(`🚨 Location Error: ${locationError}. Please check your device's location/GPS settings.`)
      } else if (locationStatus === 'loading' || !userLocation) {
        alert("🛰️ Acquiring GPS coordinates... Please ensure location services are enabled on your device and wait a moment.")
      } else {
        setShowSosModal(true)
        setSosCountdown(null)
      }
    }
  }

  const startSosCountdown = (type) => {
    if (!userLocation) {
      alert("⚠️ Error: Location signal lost. Please wait until GPS coordinates are re-acquired.")
      return
    }

    setSosType(type)
    setSosCountdown(3)
    
    if (sosCountdownIntervalRef.current) clearInterval(sosCountdownIntervalRef.current)
    
    sosCountdownIntervalRef.current = setInterval(() => {
      setSosCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(sosCountdownIntervalRef.current)
          sosCountdownIntervalRef.current = null
          triggerSOS(type)
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const cancelSosCountdown = () => {
    if (sosCountdownIntervalRef.current) {
      clearInterval(sosCountdownIntervalRef.current)
      sosCountdownIntervalRef.current = null
    }
    setSosCountdown(null)
    setShowSosModal(false)
  }

  const triggerSOS = (type) => {
    if (!userLocation) {
      alert("⚠️ Error: Precise location coordinates unavailable. SOS broadcast aborted.")
      setActiveSOS(false)
      alarmGenerator.stop()
      return
    }

    setShowSosModal(false)
    setActiveSOS(true)
    
    // Start Audio Siren
    alarmGenerator.start()

    const userId = getUserId()
    const userName = currentUser ? (currentUser.name || currentUser.username) : 'Anonymous User'
    setSosCoords(userLocation)

    // Trigger immediate socket.io alarm with user's actual location
    socket.emit('sos:trigger', {
      userId,
      userName,
      lat: userLocation.lat,
      lng: userLocation.lng,
      accuracy: userLocation.accuracy,
      confidence: userLocation.confidence,
      isStable: userLocation.isStable,
      type,
      city: 'Live Emergency Location'
    })
  }

  const resolveSOS = () => {
    const userId = getUserId()
    
    // Stop Audio Siren
    alarmGenerator.stop()

    // Emit socket resolve
    socket.emit('sos:resolve', { userId })

    setActiveSOS(false)
    setSosCoords(null)
    setSosCountdown(null)
    setShowSosModal(false)
  }

  // Watch active coordinate changes and broadcast updates to the backend in real-time
  useEffect(() => {
    if (activeSOS) {
      if (userLocation) {
        setSosCoords(userLocation)
        const userId = getUserId()
        socket.emit('sos:update_location', {
          userId,
          lat: userLocation.lat,
          lng: userLocation.lng,
          accuracy: userLocation.accuracy,
          confidence: userLocation.confidence,
          isStable: userLocation.isStable
        })
      } else {
        console.warn("SOS active but user location dropped temporarily.")
      }
    }
  }, [userLocation, activeSOS])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(err => console.warn('Notification permission request rejected:', err))
    }

    return () => {
      if (sosCountdownIntervalRef.current) clearInterval(sosCountdownIntervalRef.current)
      alarmGenerator.stop()
    }
  }, [])

  const showNotification = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden font-sans text-slate-200">
      
      {/* ── Toast Notification ─────────────────────────────────────── */}
      <div className={`
        absolute top-4 left-1/2 -translate-x-1/2 z-[5000]
        transition-all duration-300 ease-out
        ${notification ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}
      `}>
        <div className="bg-slate-900/90 text-white px-4 py-2 rounded-full shadow-lg border border-white/15 text-sm font-medium backdrop-blur-md">
          {notification}
        </div>
      </div>

      {currentPath === '/admin' ? (
        currentUser && currentUser.role === 'admin' ? (
          <AdminDashboard 
            currentUser={currentUser} 
            navigateTo={navigateTo} 
            showNotification={showNotification} 
            onSignOut={() => setCurrentUser(null)} 
          />
        ) : (
          <AdminGate 
            onAuthSuccess={(user) => {
              setCurrentUser(user);
            }} 
            navigateTo={navigateTo} 
            showNotification={showNotification} 
          />
        )
      ) : (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
          <Sidebar 
            filters={filters} 
            setFilters={setFilters} 
            isSharingLocation={isSharingLocation}
            setIsSharingLocation={setIsSharingLocation}
            userLocation={userLocation}
            locationStatus={locationStatus}
            locationError={locationError}
            activeSOS={activeSOS}
            handleSosClick={handleSosClick}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            routeDestination={routeDestination}
            setRouteDestination={setRouteDestination}
            routesData={routesData}
            setRoutesData={setRoutesData}
            selectedRouteIndex={selectedRouteIndex}
            setSelectedRouteIndex={setSelectedRouteIndex}
            setShowAnonymousTipModal={setShowAnonymousTipModal}
            setShowAuthModal={setShowAuthModal}
            safeSpots={safeSpots}
            mapRef={mapInstanceRef}
            loadingSafeSpots={loadingSafeSpots}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            showRoutePlanner={showRoutePlanner}
            setShowRoutePlanner={setShowRoutePlanner}
            fromLocation={fromLocation}
            setFromLocation={setFromLocation}
            transportMode={transportMode}
            setTransportMode={setTransportMode}
            language={language}
            setLanguage={setLanguage}
          />
          
          <div className="flex-1 h-full relative overflow-hidden">
            <header className="
              absolute top-4 left-20 md:left-4 right-4 md:right-auto z-[1000]
              flex items-center gap-2 md:gap-3
            ">

              <div className="
                hidden md:flex relative items-center justify-center
                w-12 h-12 shrink-0 rounded-full overflow-hidden
                shadow-[0_0_15px_rgba(14,165,233,0.4)]
                bg-slate-900
              ">
                <Globe3DDemo />
              </div>

              <div className="hidden md:flex flex-col leading-none gap-1 mr-2 shrink-0">
                <h1 className="
                  text-[1.5rem] font-black tracking-tight leading-none
                  bg-gradient-to-r from-slate-950 via-slate-800 to-cyan-700 bg-clip-text text-transparent
                  drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]
                ">
                  {language === 'hi' ? 'जागृति' : 'Jagriti'}
                </h1>
                <p className="hidden lg:block text-[0.55rem] font-extrabold text-slate-500 tracking-[0.12em] uppercase">
                  {language === 'hi' ? 'अपने आस-पास को जानें। सुरक्षित रहें।' : 'Know Your Surroundings. Stay Safe.'}
                </p>
              </div>

              <div className="hidden md:block w-px h-6 bg-gray-300/30 mx-1" />

              <SearchBar mapRef={mapInstanceRef} />

              <div className="z-[1000] flex items-center gap-2 shrink-0">
                {currentUser && currentUser.role === 'admin' && (
                  <button
                    onClick={() => navigateTo('/admin')}
                    className="
                      flex items-center gap-1 px-3 py-2.5 text-xs font-extrabold rounded-xl
                      bg-indigo-650 hover:bg-indigo-600 text-white shadow-lg cursor-pointer
                      transition-all duration-200 border-none uppercase tracking-wider
                    "
                    title="Open Administration Console"
                  >
                    Console
                  </button>
                )}
              </div>
            </header>

            <MapView 
              filters={filters} 
              showNotification={showNotification} 
              mapInstanceRef={mapInstanceRef} 
              userLocation={userLocation}
              locationStatus={locationStatus}
              routeDestination={routeDestination}
              routesData={routesData}
              setRoutesData={setRoutesData}
              selectedRouteIndex={selectedRouteIndex}
              setSelectedRouteIndex={setSelectedRouteIndex}
              refreshTrigger={refreshTrigger}
              setShowAuthModal={setShowAuthModal}
              setSafeSpots={setSafeSpots}
              setLoadingSafeSpots={setLoadingSafeSpots}
              showRoutePlanner={showRoutePlanner}
              fromLocation={fromLocation}
              transportMode={transportMode}
              language={language}
            />
            <SosWarningBanner />
            <SosButton 
              userLocation={userLocation} 
              locationStatus={locationStatus} 
              locationError={locationError}
              activeSOS={activeSOS}
              showModal={showSosModal}
              setShowModal={setShowSosModal}
              countdown={sosCountdown}
              cancelCountdown={cancelSosCountdown}
              startCountdown={startSosCountdown}
              resolveSOS={resolveSOS}
            />
            <AnonymousTipModal 
              isOpen={showAnonymousTipModal}
              onClose={() => setShowAnonymousTipModal(false)}
              userLocation={userLocation}
              showNotification={showNotification}
              refreshIncidents={() => setRefreshTrigger(t => t + 1)}
            />

            <AuthModal 
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
              initialMode={authModalMode}
              onAuthSuccess={(user) => {
                setCurrentUser(user);
                showNotification(language === 'hi' ? `आपका स्वागत है, ${user.name || user.username}!` : `Welcome back, ${user.name || user.username}!`);
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App