import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import 'leaflet.heat'
import { Layers } from 'lucide-react'
import SearchBar from './SearchBar'
import ReportFAB from './ReportFAB'
import ReportModal from './ReportModal'
import LocateMeButton from './LocateMeButton'
import socket from '../utils/socket'
import { fetchSafeSpots } from '../utils/OverpassService'
import { API_BASE_URL } from '../utils/apiConfig'

const CRIME_COLORS = {
  theft: '#f97316',
  harassment: '#f43f5e',
  assault: '#ef4444',
  suspicious: '#eab308',
  other: '#94a3b8',
}

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function MapView({ 
  filters, 
  showNotification, 
  mapInstanceRef, 
  userLocation, 
  locationStatus,
  routeDestination,
  routesData,
  setRoutesData,
  selectedRouteIndex,
  setSelectedRouteIndex,
  refreshTrigger,
  setShowAuthModal,
  setSafeSpots,
  setLoadingSafeSpots,
  language
}) {
  const mapRef = useRef(null)
  const markerClusterGroupRef = useRef(null)
  const heatLayerRef = useRef(null)
  const userMarkerRef = useRef(null)
  const sharersMarkersRef = useRef(new Map())
  const [incidents, setIncidents] = useState([])
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isHeatmap, setIsHeatmap] = useState(true)
  const [currentZoom, setCurrentZoom] = useState(5)
  const [locationName, setLocationName] = useState('Detecting address...')
  const lastGeocodedCoordsRef = useRef(null)
  const routeLayersRef = useRef([])
  const safeSpotsMarkersRef = useRef([])
  const warnedIncidentsRef = useRef(new Set())
  const [activeSharers, setActiveSharers] = useState([])
  const warnedUsersRef = useRef(new Set())

  // Reverse geocode user coordinates to a location name
  useEffect(() => {
    if (!userLocation) return

    const shouldGeocode = !lastGeocodedCoordsRef.current || 
      Math.abs(lastGeocodedCoordsRef.current.lat - userLocation.lat) > 0.0002 ||
      Math.abs(lastGeocodedCoordsRef.current.lng - userLocation.lng) > 0.0002

    if (shouldGeocode) {
      lastGeocodedCoordsRef.current = userLocation
      
      const fetchLocationName = async () => {
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?lat=${userLocation.lat}&lon=${userLocation.lng}&format=json&accept-language=${language}`
          const res = await fetch(url, { headers: { 'Accept-Language': language } })
          const data = await res.json()
          if (data && data.display_name) {
            // Get simplified address (e.g. Road name / Suburb)
            const parts = data.display_name.split(',')
            const simplified = parts.slice(0, 3).join(',').trim()
            setLocationName(simplified)
          } else {
            setLocationName(`${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`)
          }
        } catch (err) {
          console.error("Error reverse geocoding:", err)
          setLocationName(`${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`)
        }
      }
      fetchLocationName()
    }
  }, [userLocation, language])

  // Real-time other active sharers rendering
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const handleSharerList = (list) => {
      const currentUserId = localStorage.getItem('jagriti_user_id')
      const activeIds = new Set(list.map(u => u.userId))
      
      // Clear markers not in the new active list
      sharersMarkersRef.current.forEach((marker, id) => {
        if (!activeIds.has(id)) {
          marker.remove()
          sharersMarkersRef.current.delete(id)
        }
      })

      list.forEach((user) => {
        if (user.userId === currentUserId) return
        updateSharerMarker(user)
      })

      setActiveSharers(list)
    }

    const handleSharerStarted = (user) => {
      const currentUserId = localStorage.getItem('jagriti_user_id')
      if (user.userId === currentUserId) return
      updateSharerMarker(user)
      setActiveSharers(prev => [...prev.filter(u => u.userId !== user.userId), user])
    }

    const handleSharerLocationUpdated = (user) => {
      const currentUserId = localStorage.getItem('jagriti_user_id')
      if (user.userId === currentUserId) return
      updateSharerMarker(user)
      setActiveSharers(prev => [...prev.filter(u => u.userId !== user.userId), user])
    }

    const handleSharerStopped = ({ userId }) => {
      const marker = sharersMarkersRef.current.get(userId)
      if (marker) {
        marker.remove()
        sharersMarkersRef.current.delete(userId)
      }
      setActiveSharers(prev => prev.filter(u => u.userId !== userId))
    }

    const updateSharerMarker = (user) => {
      const { userId, lat, lng } = user
      const existingMarker = sharersMarkersRef.current.get(userId)
      if (existingMarker) {
        existingMarker.setLatLng([lat, lng])
      } else {
        const newMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'sharer-location-marker',
            html: `
              <div class="relative flex items-center justify-center w-6 h-6 animate-pulse">
                <div class="absolute w-4 h-4 bg-emerald-500/60 rounded-full animate-ping"></div>
                <div class="relative w-3.5 h-3.5 bg-emerald-50 border-2 border-white rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(map).bindPopup(`
          <div style="font-family: 'Inter', sans-serif; font-size: 0.8rem; text-align: center;">
            🟢 <strong>${language === 'hi' ? 'सक्रिय सुरक्षा सदस्य' : 'Active Safety Share'}</strong><br/>
            <span style="color: #64748b; font-size: 0.75rem;">${language === 'hi' ? 'अनाम सदस्य अपना ट्रैक साझा कर रहा है' : 'Anonymous user sharing track'}</span>
          </div>
        `)
        sharersMarkersRef.current.set(userId, newMarker)
      }
    }

    socket.on('sharing:active_list', handleSharerList)
    socket.on('sharing:started', handleSharerStarted)
    socket.on('sharing:location_updated', handleSharerLocationUpdated)
    socket.on('sharing:stopped', handleSharerStopped)

    socket.emit('sharing:get_active')

    return () => {
      socket.off('sharing:active_list', handleSharerList)
      socket.off('sharing:started', handleSharerStarted)
      socket.off('sharing:location_updated', handleSharerLocationUpdated)
      socket.off('sharing:stopped', handleSharerStopped)
    }
  }, [mapInstanceRef.current, language])

  // Proximity check for other active users nearby
  const checkNearbyUsers = (sharersList) => {
    if (!userLocation || !sharersList || sharersList.length === 0) return;
    
    // Both devices must have stable coordinates and high confidence (>= 0.75)
    if (userLocation.confidence < 0.75 || !userLocation.isStable) return;

    sharersList.forEach(u => {
      const currentUserId = localStorage.getItem('jagriti_user_id')
      if (u.userId === currentUserId) return;

      const otherConfidence = u.confidence !== undefined ? u.confidence : 1.0;
      const otherIsStable = u.isStable !== undefined ? u.isStable : true;

      if (otherConfidence >= 0.75 && otherIsStable) {
        const distKm = getDistanceKm(userLocation.lat, userLocation.lng, u.lat, u.lng);
        const distM = distKm * 1000;

        if (distM <= 50) {
          const warnKey = `${u.userId}_nearby`;
          if (!warnedUsersRef.current.has(warnKey)) {
            warnedUsersRef.current.add(warnKey);

            const msg = language === 'hi'
              ? `⚠️ सुरक्षा चेतावनी: एक सक्रिय सदस्य आपके पास है (${distM.toFixed(0)} मीटर की दूरी पर)`
              : `⚠️ Proximity Alert: Another active safety user is nearby (${distM.toFixed(0)}m away)`;

            if (showNotification) showNotification(msg);

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(language === 'hi' ? 'जागृति सुरक्षा चेतावनी' : 'Jagriti Proximity Warning', {
                body: language === 'hi' 
                  ? `सक्रिय सुरक्षा सदस्य आपके अत्यंत निकट है (${distM.toFixed(0)}मी)।` 
                  : `Active safety user is nearby (${distM.toFixed(0)}m).`,
                icon: '/icon-192x192.png'
              });
            }
          }
        } else {
          const warnKey = `${u.userId}_nearby`;
          if (warnedUsersRef.current.has(warnKey) && distM > 70) {
            warnedUsersRef.current.delete(warnKey);
          }
        }
      }
    });
  }

  // Check nearby users whenever user location or active sharers updates
  useEffect(() => {
    checkNearbyUsers(activeSharers);
  }, [userLocation, activeSharers, language]);

  // Real-time user location marker
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !userLocation) return

    const popupContent = `
      <div style="font-family: 'Inter', sans-serif; text-align: center; min-width: 145px; padding: 2px 4px;">
        <span style="font-weight: 800; color: #2563eb; font-size: 0.85rem; display: block; margin-bottom: 4px;">📍 You are here</span>
        <span style="color: #475569; font-size: 0.75rem; font-weight: 600; display: block; line-height: 1.35;">
          ${locationName || 'Detecting address...'}
        </span>
      </div>
    `

    // If marker already exists, update position and popup content
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng])
      userMarkerRef.current.setPopupContent(popupContent)
    } else {
      // Create a pulsing blue marker
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: `
            <div class="relative flex items-center justify-center w-6 h-6">
              <div class="absolute w-4 h-4 bg-blue-500/60 rounded-full animate-ping"></div>
              <div class="relative w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(map).bindPopup(popupContent)
    }
  }, [userLocation, locationName])

  // Safe Route Planner logic (OSRM routing + safety path scoring)
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Clean up old route layers
    routeLayersRef.current.forEach(layer => layer.remove())
    routeLayersRef.current = []

    if (!userLocation || !routeDestination) {
      setRoutesData([])
      return
    }

    const getDistanceKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLon = (lon2 - lon1) * Math.PI / 180
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c
    }

    const fetchRoutes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/routes/suggest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startLat: userLocation.lat,
            startLon: userLocation.lng,
            endLat: routeDestination.lat,
            endLon: routeDestination.lng,
            transportMode: 'car'
          })
        })
        const data = await response.json()
        
        if (data.status !== 'success' || !data.routes || data.routes.length === 0) {
          if (showNotification) showNotification(language === 'hi' ? 'मार्ग की गणना करने में विफल।' : 'No routes found to the destination.')
          return
        }

        const scoredRoutes = data.routes;
        setRoutesData(scoredRoutes)

        // Draw routes on map
        scoredRoutes.forEach((route, idx) => {
          const isSelected = idx === selectedRouteIndex
          
          if (isSelected) {
            // Draw color-coded segments for the active route
            route.segments.forEach(seg => {
              const segLatLngs = seg.coordinates
              const colorMap = {
                green: '#10b981',
                yellow: '#f59e0b',
                red: '#ef4444'
              }
              const color = colorMap[seg.colorCode] || '#10b981'
              
              const polyline = L.polyline(segLatLngs, {
                color,
                weight: 6,
                opacity: 0.95,
                lineJoin: 'round'
              }).addTo(map)
              
              polyline.bindPopup(`
                <div style="font-family: 'Inter', sans-serif; font-size: 0.75rem;">
                  <strong>${language === 'hi' ? 'मार्ग खंड' : 'Route Segment'}</strong><br/>
                  ${language === 'hi' ? 'सुरक्षा स्कोर' : 'Safety Score'}: <span style="font-weight: bold; color: ${color}">${seg.safetyScore}%</span><br/>
                  ${language === 'hi' ? 'आस-पास के खतरे' : 'Hotspots Nearby'}: <strong>${seg.incidentsNearby}</strong>
                </div>
              `)
              
              routeLayersRef.current.push(polyline)
            })
          } else {
            // Draw alternative routes as thin grey lines
            const latLngs = route.geometry.coordinates.map(c => [c[1], c[0]])
            const polyline = L.polyline(latLngs, {
              color: '#94a3b8',
              weight: 4,
              opacity: 0.4,
              lineJoin: 'round'
            }).addTo(map)
            
            polyline.bindPopup(`
              <div style="font-family: 'Inter', sans-serif; font-size: 0.75rem;">
                <strong>${language === 'hi' ? `वैकल्पिक मार्ग ${idx}` : `Alternative Route ${idx}`}</strong><br/>
                ${language === 'hi' ? 'दूरी' : 'Distance'}: ${(route.distance / 1000).toFixed(1)} km<br/>
                ${language === 'hi' ? 'समय' : 'Time'}: ${Math.round(route.duration / 60)} mins<br/>
                ${language === 'hi' ? 'सुरक्षा स्तर' : 'Safety'}: <strong>${route.safetyScore}%</strong>
              </div>
            `)
            
            routeLayersRef.current.push(polyline)
          }
        })

        // Zoom map to fit the safest route bounds
        if (scoredRoutes.length > 0) {
          const latLngs = scoredRoutes[0].geometry.coordinates.map(c => [c[1], c[0]])
          map.flyToBounds(latLngs, { padding: [50, 50], duration: 1.2 })
        }

      } catch (err) {
        console.error('OSRM Routing failed:', err)
        if (showNotification) showNotification('Failed to calculate safe routes.')
      }
    }

    fetchRoutes()

  }, [userLocation, routeDestination, selectedRouteIndex, language])

  // Update route path styling when selection changes
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || routeLayersRef.current.length === 0 || routesData.length === 0) return

    routeLayersRef.current.forEach((polyline, idx) => {
      const route = routesData[idx]
      if (!route) return

      const isSelected = idx === selectedRouteIndex
      const safety = route.safetyScore
      let activeColor = '#10b981' // Green
      if (safety < 65) activeColor = '#ef4444' // Red
      else if (safety < 85) activeColor = '#f97316' // Orange

      polyline.setStyle({
        color: isSelected ? activeColor : '#94a3b8',
        weight: isSelected ? 7 : 4,
        opacity: isSelected ? 0.95 : 0.4
      })

      if (isSelected) {
        polyline.bringToFront()
      }
    })
  }, [selectedRouteIndex, routesData])

  // Fetch and draw Safe Spots layer when enabled
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const clearSafeSpots = () => {
      safeSpotsMarkersRef.current.forEach(m => m.remove())
      safeSpotsMarkersRef.current = []
    }

    if (!filters.showSafeSpots) {
      clearSafeSpots()
      setSafeSpots([])
      return
    }

    const emojiMap = {
      police: '🚨',
      hospital: '🏥',
      pharmacy: '💊',
      metro: '🚇',
      fuel: '⛽',
      ev_charging: '⚡'
    }

    const typeNames = {
      en: {
        police: 'Police Station/Chowki',
        hospital: 'Hospital/Clinic',
        pharmacy: 'Chemist/Pharmacy',
        metro: 'Metro Station',
        fuel: 'Petrol/CNG Pump',
        ev_charging: 'EV Charging Station'
      },
      hi: {
        police: 'पुलिस स्टेशन/चौकी',
        hospital: 'अस्पताल/क्लिनिक',
        pharmacy: 'केमिस्ट/दवा की दुकान',
        metro: 'मेट्रो स्टेशन',
        fuel: 'पेट्रोल/सीएनजी पंप',
        ev_charging: 'ईवी चार्जिंग स्टेशन'
      }
    };

    const updateSafeSpots = async () => {
      try {
        const zoom = map.getZoom()
        if (zoom < 13) {
          clearSafeSpots()
          setSafeSpots([])
          return
        }
        if (setLoadingSafeSpots) setLoadingSafeSpots(true)
        const bounds = map.getBounds()
        const spots = await fetchSafeSpots(bounds)
        
        // Clear existing first
        clearSafeSpots()

        const maxRadiusMeters = filters.safeSpotsRadius ?? 1000
        const validSpots = []

        spots.forEach(spot => {
          let distanceKm = null
          if (userLocation) {
            distanceKm = getDistanceKm(userLocation.lat, userLocation.lng, spot.lat, spot.lng)
            if (distanceKm * 1000 > maxRadiusMeters) {
              return
            }
          }

          validSpots.push({ ...spot, distanceKm })

          const marker = L.marker([spot.lat, spot.lng], {
            icon: L.divIcon({
              className: 'safe-spot-marker',
              html: `
                <div class="flex items-center justify-center w-6 h-6 rounded-full bg-slate-950 border border-emerald-400 shadow-md text-[10px] select-none hover:scale-110 transition-transform duration-150">
                  ${emojiMap[spot.type] || '🛡️'}
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })
          }).addTo(map)

          const distanceText = distanceKm !== null
            ? `<span style="font-size: 0.68rem; font-weight: 800; color: #10b981; display: block; margin-top: 4px;">
                 📍 ${(distanceKm * 1000) < 1000 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(2)} km`} ${language === 'hi' ? 'दूर' : 'away'}
               </span>`
            : '';

          const spotTypeLabel = (typeNames[language] || typeNames['en'])[spot.type] || spot.type;

          const popupContent = `
            <div style="font-family: 'Inter', sans-serif; min-width: 140px; padding: 2px 4px;">
              <div style="font-weight: 800; font-size: 0.7rem; text-transform: uppercase; color: #10b981; margin-bottom: 2px;">
                🛡️ ${language === 'hi' ? `आस-पास का ${spotTypeLabel}` : `Nearby ${spotTypeLabel}`}
              </div>
              <strong style="font-size: 0.78rem; color: #1e293b; display: block; margin-bottom: 3px;">
                ${spot.name}
              </strong>
              <span style="font-size: 0.68rem; color: #64748b; display: block; margin-bottom: 2px;">
                ${spot.details}
              </span>
              ${distanceText}
            </div>
          `
          marker.bindPopup(popupContent)
          safeSpotsMarkersRef.current.push(marker)
        })

        setSafeSpots(validSpots)
      } catch (err) {
        console.error('Failed to update safe spots:', err)
        setSafeSpots([])
      } finally {
        if (setLoadingSafeSpots) setLoadingSafeSpots(false)
      }
    }

    updateSafeSpots()

    return () => {
      clearSafeSpots()
      setSafeSpots([])
    }
  }, [filters.showSafeSpots, filters.safeSpotsSearchTrigger, userLocation, language])

  // Proximity Warning Alert System (watches userLocation vs incidents coordinates)
  useEffect(() => {
    if (!userLocation || incidents.length === 0) return

    incidents.forEach(inc => {
      const incLng = inc.location?.coordinates?.[0]
      const incLat = inc.location?.coordinates?.[1]
      
      if (incLng && incLat) {
        const incId = inc.id || inc._id || `${incLat}-${incLng}`
        if (!warnedIncidentsRef.current.has(incId)) {
          const dist = getDistanceKm(userLocation.lat, userLocation.lng, incLat, incLng)
          if (dist <= 0.4) { // 400 meters safety threshold
            warnedIncidentsRef.current.add(incId)
            
            const msg = `⚠️ Proximity Alert: ${inc.type.toUpperCase()} reported nearby (${(dist * 1000).toFixed(0)}m away)`
            if (showNotification) showNotification(msg)

            // Trigger PWA system notifications
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                navigator.serviceWorker.ready.then(reg => {
                  reg.showNotification('Jagriti Safety Warning', {
                    body: `${inc.type.toUpperCase()}: ${inc.title || 'Incident reported nearby'}. Stay alert.`,
                    icon: '/icon-192x192.png',
                    vibrate: [200, 100, 200],
                    tag: 'proximity-warning'
                  })
                })
              } catch (e) {
                console.warn('Failed to fire background SW notification, fallback to browser Notification:', e)
                new Notification('Jagriti Safety Warning', {
                  body: `${inc.type.toUpperCase()}: ${inc.title || 'Incident reported nearby'}. Stay alert.`,
                  icon: '/icon-192x192.png'
                })
              }
            }
          }
        }
      }
    })
  }, [userLocation, incidents])

  // Fetch live incidents from backend
  const fetchIncidents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/incidents`)
      const data = await response.json()
      if (data.status === 'success') {
        setIncidents(data.data)
        localStorage.setItem('jagriti_cached_incidents', JSON.stringify(data.data))
      }
    } catch (error) {
      console.warn('Failed to fetch live incidents, attempting offline cache fallback:', error)
      const cached = localStorage.getItem('jagriti_cached_incidents')
      if (cached) {
        setIncidents(JSON.parse(cached))
        if (showNotification) showNotification('Offline Mode: Loaded cached safety data.')
      }
    }
  }

  // Setup global function for popup button clicks
  useEffect(() => {
    window.confirmCommunityIncident = async (id) => {
      let userId = localStorage.getItem('jagriti_user_id')
      if (!userId) {
        userId = 'anon_' + Math.random().toString(36).substring(2, 15)
        localStorage.setItem('jagriti_user_id', userId)
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/incidents/${id}/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        })
        const data = await response.json()
        if (data.status === 'success') {
          alert(data.message)
          fetchIncidents() // Reload map data
        } else {
          alert(data.message || 'Failed to confirm')
        }
      } catch (err) {
        alert('Network error confirming incident')
      }
    }
  }, [])

  useEffect(() => {
    fetchIncidents()
  }, [refreshTrigger])

  useEffect(() => {
    if (filters.searchTrigger > 0) {
      // Re-calculate matching incidents to log
      const matchIncidents = incidents.filter(inc => {
        const typeMatch = filters.crimeType === 'all' || inc.type === filters.crimeType;
        let dateMatch = true;
        if (inc.date) {
          const incDate = new Date(inc.date);
          if (filters.startDate) {
            const start = new Date(filters.startDate);
            start.setHours(0, 0, 0, 0);
            if (incDate < start) dateMatch = false;
          }
          if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            if (incDate > end) dateMatch = false;
          }
        }
        return typeMatch && dateMatch;
      });

      const msg = `Found ${matchIncidents.length} incidents for the selected criteria.`;
      
      // Log to backend IDE terminal
      fetch(`${API_BASE_URL}/api/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, data: matchIncidents })
      }).catch(err => console.error('Failed to log to terminal:', err));
      
      if (showNotification) showNotification(msg);
    }
  }, [filters.searchTrigger])

  useEffect(() => {
    // Init map only once
    if (mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [20.5937, 78.9629], // India center
      zoom: 5,
      zoomControl: false, // Disable default to move it later
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // High-Detail OpenStreetMap Mapnik Tiles (detailed roads, tolls, expressways, names)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom())
    })
    setCurrentZoom(map.getZoom())

    // Init MarkerClusterGroup
    const markers = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
    })
    map.addLayer(markers)
    
    mapInstanceRef.current = map
    markerClusterGroupRef.current = markers
  }, [])

  useEffect(() => {
    const map = mapInstanceRef.current
    const markersGroup = markerClusterGroupRef.current
    if (!map || !markersGroup) return

    // Clear old markers and heat layer
    markersGroup.clearLayers()
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current)
      heatLayerRef.current = null
    }

    // Filter incidents
    const filtered = incidents.filter(inc => {
      // Crime type check
      let typeMatch = filters.crimeType === 'all' || inc.type === filters.crimeType;
      if (filters.onlyWomenSafety) {
        // Narrow down to harassment, assault, and suspicious activities for women safety
        typeMatch = inc.type === 'harassment' || inc.type === 'assault' || inc.type === 'suspicious';
      }
      
      // Data source check
      let sourceMatch = true;
      if (filters.dataSource === 'ncrb') {
        sourceMatch = inc.source === 'ncrb';
      } else if (filters.dataSource === 'live') {
        sourceMatch = inc.source === 'nlp' || inc.source === 'community';
      }
      
      // Date check
      let dateMatch = true;
      if (inc.date) {
        const incDate = new Date(inc.date);
        if (filters.startDate) {
          const start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          if (incDate < start) dateMatch = false;
        }
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          if (incDate > end) dateMatch = false;
        }
      }

      // Time of Day check
      let timeMatch = true;
      if (inc.date && filters.timeOfDay !== 'all') {
        const hour = new Date(inc.date).getHours();
        if (filters.timeOfDay === 'day') {
          timeMatch = hour >= 6 && hour < 18;
        } else if (filters.timeOfDay === 'night') {
          timeMatch = hour >= 18 || hour < 6;
        }
      }

      // Location Confidence check
      let confidenceMatch = true;
      if (inc.source === 'nlp' && !inc.isVerified) {
        confidenceMatch = false;
      }

      return typeMatch && sourceMatch && dateMatch && timeMatch && confidenceMatch;
    })

    // Render based on mode
    if (isHeatmap) {
      // Heatmap Mode
      const heatPoints = filtered.map(inc => {
        const lng = inc.location?.coordinates?.[0] || 0
        const lat = inc.location?.coordinates?.[1] || 0
        return [lat, lng, 1] // [lat, lng, intensity]
      })

      const heatOptions = {
        radius: 28,
        blur: 20,
        maxZoom: 15,
        minOpacity: 0.15,
        gradient: {
          0.15: '#818cf8', // Soft Indigo/Lavender (very low)
          0.4: '#ec4899',  // Vibrant Pink/Rose (moderate)
          0.65: '#f97316', // Warm Amber/Orange (high)
          0.85: '#e11d48', // Crimson Red (critical)
          1.0: '#9f1239'   // Deep Ruby Red (maximum density cluster)
        }
      }

      heatLayerRef.current = L.heatLayer(heatPoints, heatOptions).addTo(map)
    } else {
      // Pin/Cluster Mode
      filtered.forEach(inc => {
        const color = CRIME_COLORS[inc.type] || CRIME_COLORS.other

        const lng = inc.location?.coordinates?.[0] || 0
        const lat = inc.location?.coordinates?.[1] || 0
        const isNlpLowConfidence = inc.source === 'nlp' && inc.confidence_score !== undefined && inc.confidence_score !== null && inc.confidence_score < 0.5;
        const isUnverified = (inc.source === 'community' && !inc.isVerified) || isNlpLowConfidence;
        
        let fillOpacity = 0.9;
        if (isUnverified) {
          fillOpacity = isNlpLowConfidence ? 0.4 : 0.5;
        }

        const marker = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: fillOpacity,
          dashArray: isUnverified ? '4' : '', // Dashed border for unverified or low-confidence reports
        })

        const titleHi = inc.title_hi || '';
        const descHi = inc.description_hi || '';

        const activeTitle = language === 'hi' && titleHi ? titleHi : inc.title;
        const activeDesc = language === 'hi' && descHi ? descHi : inc.description;

        // Clean up title and description from encoding glitches dynamically
        const cleanTitle = (activeTitle || '')
          .replace(/â€“/g, '–')
          .replace(/â€/g, '–')
          .replace(/â€™/g, "'")
          .replace(/Â/g, '');

        const cleanDesc = (activeDesc || '')
          .replace(/â€“/g, '–')
          .replace(/â€/g, '–')
          .replace(/â€™/g, "'")
          .replace(/Â/g, '');

        const sourceUrl = inc.sources && inc.sources.length > 0 ? inc.sources[0].sourceUrl : null;
        const titleHtml = activeTitle ? `<strong style="display:block; margin-bottom:6px; font-size:0.9rem; color:#1e293b; line-height:1.3;">${cleanTitle}</strong>` : '';
        const descHtml = activeDesc ? `<p style="color:#475569; font-size:0.8rem; margin-bottom:8px; line-height:1.4;">${cleanDesc}</p>` : '';
        const sourceHtml = sourceUrl ? `<a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" style="color:#3b82f6; font-size:0.75rem; text-decoration:none; display:inline-block; margin-top:4px; font-weight:600;">${language === 'hi' ? 'स्रोत पढ़ें ↗' : 'Read Source ↗'}</a>` : '';

        // Verification UI
        let verifyHtml = '';
        if (inc.source === 'community') {
          if (!inc.isVerified) {
            verifyHtml = `
              <div style="margin-top: 10px; padding: 8px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px;">
                <p style="font-size: 0.7rem; color: #c2410c; margin-bottom: 6px; font-weight: 600;">
                  ${language === 'hi' ? `⚠️ असत्यापित रिपोर्ट (${inc.confirmations}/3 पुष्टि)` : `⚠️ Unverified Report (${inc.confirmations}/3 confirmations)`}
                </p>
                <button onclick="window.confirmCommunityIncident('${inc.id}')" style="width: 100%; padding: 6px; background: #f97316; color: white; border: none; border-radius: 4px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">
                  ${language === 'hi' ? 'मैं पुष्टि कर सकता हूँ कि यह हुआ था' : 'I can confirm this happened'}
                </button>
              </div>
            `;
          } else {
            verifyHtml = `
              <div style="margin-top: 10px; display: flex; align-items: center; gap: 4px;">
                <span style="color: #10b981; font-size: 0.75rem;">✓ ${language === 'hi' ? 'कम्युनिटी द्वारा सत्यापित' : 'Community Verified'}</span>
              </div>
            `;
          }
        } else if (isNlpLowConfidence) {
           verifyHtml = `
              <div style="margin-top: 10px; padding: 8px; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px;">
                <span style="color: #ef4444; font-size: 0.7rem; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                  ${language === 'hi' ? `⚠️ असत्यापित एनएलपी (कम आत्मविश्वास: ${(inc.confidence_score * 100).toFixed(0)}%)` : `⚠️ Unverified NLP (Low Confidence: ${(inc.confidence_score * 100).toFixed(0)}%)`}
                </span>
              </div>
            `;
        } else if (inc.source === 'ncrb') {
            verifyHtml = `
              <div style="margin-top: 10px; display: flex; align-items: center; gap: 4px;">
                <span style="color: #3b82f6; font-size: 0.75rem; font-weight: 600;">🏛️ ${language === 'hi' ? 'आधिकारिक एनसीआरबी (NCRB) डेटा' : 'Official NCRB Data'}</span>
              </div>
            `;
        }

        const crimeTypeLabels = {
          all: { en: 'All Incidents', hi: 'सभी घटनाएं' },
          theft: { en: 'Theft', hi: 'चोरी' },
          harassment: { en: 'Harassment', hi: 'उत्पीड़न' },
          assault: { en: 'Assault', hi: 'हमला' },
          suspicious: { en: 'Suspicious', hi: 'संदिग्ध' },
          other: { en: 'Other', hi: 'अन्य' }
        };

        const activeTypeLabel = (crimeTypeLabels[inc.type] || crimeTypeLabels.other)[language] || inc.type;

        marker.bindPopup(`
          <div style="font-family:'Inter', sans-serif; min-width:220px; max-width:260px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <strong style="color:${color}; text-transform:uppercase; letter-spacing:0.05em; font-size:0.75rem; padding: 2px 6px; background: ${color}20; border-radius: 4px; border: 1px solid ${color}40;">
                ${activeTypeLabel}
              </strong>
              <span style="color:#64748b; font-size:0.7rem;">
                ${new Date(inc.date).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US')}
              </span>
            </div>
            ${titleHtml}
            ${descHtml}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding-top:8px; border-top: 1px solid #e2e8f0;">
              <span style="color:#64748b; font-size:0.75rem;">📍 ${inc.city || (language === 'hi' ? 'स्थान' : 'Location')}</span>
              ${sourceHtml}
            </div>
            ${verifyHtml}
          </div>
        `)

        markersGroup.addLayer(marker)
      })
    }
  }, [filters, incidents, isHeatmap, language])

  return (
    <div className="absolute inset-0">
      {/* Map canvas */}
      <div ref={mapRef} className="absolute inset-0 z-[1]" />

      {/* Floating Zoom Hint Banner */}
      {filters.showSafeSpots && currentZoom < 13 && (
        <div className="absolute top-[120px] left-1/2 -translate-x-1/2 z-[1000] bg-white border border-emerald-300 rounded-xl px-4 py-2 shadow-lg flex items-center gap-2 pointer-events-none transition-all duration-300 animate-bounce">
          <span className="text-emerald-700 font-extrabold text-[0.7rem] uppercase tracking-wider">
            {language === 'hi' ? '🔍 सुरक्षित स्थल देखने के लिए कृपया मानचित्र को और बड़ा (Zoom in) करें' : '🔍 Zoom in closer to view Safe Spots Layer'}
          </span>
        </div>
      )}

      {/* Heatmap Toggle Button */}
      <button
        onClick={() => setIsHeatmap(!isHeatmap)}
        className="
          absolute top-24 right-4 z-[1000]
          flex items-center gap-2 px-4 py-3 rounded-xl
          bg-slate-900 border border-white/10
          shadow-[0_8px_32px_rgba(0,0,0,0.4)]
          text-slate-300 hover:text-white hover:bg-slate-800
          transition-all duration-300 cursor-pointer
        "
        title={language === 'hi' ? 'हीटमैप टॉगल करें' : 'Toggle Heatmap'}
      >
        <Layers size={18} className={isHeatmap ? 'text-cyan-500' : 'text-slate-400'} />
        <span className="text-sm font-medium">{isHeatmap ? (language === 'hi' ? 'हीटमैप' : 'Heatmap') : (language === 'hi' ? 'पिन' : 'Pins')}</span>
      </button>

      {/* Locate Me Button */}
      <LocateMeButton mapRef={mapInstanceRef} userLocation={userLocation} locationStatus={locationStatus} />
      
      {/* Report Incident FAB */}
      <ReportFAB onClick={() => {
        const token = localStorage.getItem('jagriti_token');
        if (!token) {
          setShowAuthModal(true);
        } else {
          setIsReportModalOpen(true);
        }
      }} />
      
      {/* Report Modal */}
      <ReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        onReportSuccess={fetchIncidents}
        userLocation={userLocation}
      />
    </div>
  )
}