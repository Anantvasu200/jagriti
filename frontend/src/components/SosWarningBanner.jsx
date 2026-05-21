import { useState, useEffect, useRef } from 'react'
import { AlertOctagon, Volume2, ShieldAlert } from 'lucide-react'
import socket from '../utils/socket'

// Haversine distance calculator
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3 // Earth radius in meters
  const phi1 = lat1 * Math.PI / 180
  const phi2 = lat2 * Math.PI / 180
  const deltaPhi = (lat2 - lat1) * Math.PI / 180
  const deltaLambda = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export default function SosWarningBanner() {
  const [activeAlerts, setActiveAlerts] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [warningMessage, setWarningMessage] = useState(null)
  const notifiedBeaconsRef = useRef(new Set())

  // Web Audio warning beep
  const playWarningChirp = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioContextClass()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // High pitch beep
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch (e) {
      console.warn("Audio Context blocked by browser autoplay policy.", e)
    }
  }

  // Get current user location to calculate distance
  const updateUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (err) => console.log("Failed to query user location for warning calculations:", err),
        { enableHighAccuracy: true }
      )
    }
  }

  useEffect(() => {
    // Initial fetch of location
    updateUserLocation()

    // Query user location periodically (every 12 seconds) to keep safety calculation active
    const locationInterval = setInterval(updateUserLocation, 12000)

    // Listen to Socket Events
    socket.on('sos:active_list', (list) => {
      setActiveAlerts(list)
    })

    socket.on('sos:alert', (beacon) => {
      // Exclude alerts triggered by oneself
      const selfId = localStorage.getItem('jagriti_user_id')
      if (beacon.userId === selfId) return

      setActiveAlerts(prev => [...prev, beacon])
      playWarningChirp()
    })

    socket.on('sos:location_updated', (updated) => {
      setActiveAlerts(prev => prev.map(alert => 
        alert.userId === updated.userId 
          ? { ...alert, lat: updated.lat, lng: updated.lng } 
          : alert
      ))
    })

    socket.on('sos:resolved', (data) => {
      setActiveAlerts(prev => prev.filter(alert => alert.userId !== data.userId))
      notifiedBeaconsRef.current.delete(data.userId)
    })

    return () => {
      clearInterval(locationInterval)
      socket.off('sos:active_list')
      socket.off('sos:alert')
      socket.off('sos:location_updated')
      socket.off('sos:resolved')
    }
  }, [])

  // Calculate distance for all active alerts and determine proximity
  useEffect(() => {
    const selfId = localStorage.getItem('jagriti_user_id')
    const externalAlerts = activeAlerts.filter(a => a.userId !== selfId)
    
    if (externalAlerts.length === 0 || !userLocation) {
      setWarningMessage(null)
      return
    }

    // Find the closest emergency alert
    let closestAlert = null
    let minDistance = Infinity

    externalAlerts.forEach(alert => {
      const distance = getDistanceInMeters(
        userLocation.lat,
        userLocation.lng,
        alert.lat,
        alert.lng
      )

      if (distance < minDistance) {
        minDistance = distance
        closestAlert = { ...alert, distance: Math.round(distance) }
      }
    })

    // Trigger warning banner only if the closest SOS is within 500 meters
    if (closestAlert && minDistance <= 500) {
      setWarningMessage(closestAlert)
      
      // Trigger native browser notification once per beacon session
      if (!notifiedBeaconsRef.current.has(closestAlert.userId)) {
        notifiedBeaconsRef.current.add(closestAlert.userId)
        
        if ('Notification' in window && Notification.permission === 'granted') {
          const bodyText = `${closestAlert.userName || 'Anonymous User'} triggered an SOS (${closestAlert.type}) ${closestAlert.distance}m away. Stay alert!`;
          try {
            navigator.serviceWorker.ready.then(reg => {
              reg.showNotification('🚨 JAGRITI EMERGENCY SOS 🚨', {
                body: bodyText,
                icon: '/icon-192x192.png',
                vibrate: [300, 100, 300, 100, 300],
                tag: `sos-alert-${closestAlert.userId}`
              })
            })
          } catch (e) {
            new Notification('🚨 JAGRITI EMERGENCY SOS 🚨', {
              body: bodyText,
              icon: '/icon-192x192.png'
            })
          }
        }
      }
    } else {
      setWarningMessage(null)
    }
  }, [activeAlerts, userLocation])

  if (!warningMessage) return null

  return (
    <div className="
      fixed top-24 left-1/2 -translate-x-1/2 z-[2000]
      w-[90%] max-w-lg pointer-events-auto
      transition-all duration-500 ease-in-out transform translate-y-0
    ">
      <div className="
        flex items-center gap-4 p-4 rounded-2xl
        bg-red-950/80 border-2 border-red-500/60 backdrop-blur-md
        shadow-[0_8px_32px_rgba(239,68,68,0.5)] text-white
        animate-pulse
      ">
        <div className="shrink-0 w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center text-red-400">
          <AlertOctagon className="animate-spin" size={24} style={{ animationDuration: '4s' }} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-black bg-red-500 text-red-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
              CRITICAL EMERGENCY
            </span>
            <span className="text-[0.7rem] font-bold text-red-300">
              {warningMessage.distance}m away
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-100 leading-tight">
            <span className="font-extrabold text-white capitalize">{warningMessage.userName || 'Anonymous User'}</span> triggered an SOS beacon for <span className="underline font-bold text-white capitalize">{warningMessage.type}</span> nearby. Assist if safe!
          </p>
        </div>

        <button 
          onClick={playWarningChirp}
          className="shrink-0 p-2 text-red-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          title="Play alarm chirps again"
        >
          <Volume2 size={18} />
        </button>
      </div>
    </div>
  )
}
