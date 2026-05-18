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

const CRIME_COLORS = {
  theft: '#f97316',
  harassment: '#ef4444',
  assault: '#dc2626',
  suspicious: '#eab308',
  other: '#94a3b8',
}

export default function MapView({ filters, showNotification, mapInstanceRef }) {
  const mapRef = useRef(null)
  const markerClusterGroupRef = useRef(null)
  const heatLayerRef = useRef(null)
  const [incidents, setIncidents] = useState([])
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isHeatmap, setIsHeatmap] = useState(true)

  // Fetch live incidents from backend
  const fetchIncidents = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/incidents')
      const data = await response.json()
      if (data.status === 'success') {
        setIncidents(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch incidents:', error)
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
        const response = await fetch(`http://localhost:5000/api/incidents/${id}/confirm`, {
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
  }, [])

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
      fetch('http://localhost:5000/api/log', {
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

    // Premium Light Theme Map Tiles (CartoDB Positron)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 18,
    }).addTo(map)

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
      const typeMatch = filters.crimeType === 'all' || inc.type === filters.crimeType;
      
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
      return typeMatch && sourceMatch && dateMatch;
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
        radius: 25,
        blur: 15,
        maxZoom: 14,
        gradient: {
          0.2: '#0ea5e9', // Light blue
          0.4: '#10b981', // Emerald
          0.6: '#eab308', // Yellow
          0.8: '#f97316', // Orange
          1.0: '#ef4444'  // Red
        }
      }

      heatLayerRef.current = L.heatLayer(heatPoints, heatOptions).addTo(map)
    } else {
      // Pin/Cluster Mode
      filtered.forEach(inc => {
        const color = CRIME_COLORS[inc.type] || CRIME_COLORS.other

        const lng = inc.location?.coordinates?.[0] || 0
        const lat = inc.location?.coordinates?.[1] || 0

        let fillOpacity = 0.9;
        let isUnverified = inc.source === 'community' && !inc.isVerified;
        
        if (isUnverified) {
          fillOpacity = 0.5; // Make unverified pins slightly transparent
        }

        const marker = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: color,
          color: isUnverified ? '#ffffff' : '#ffffff',
          weight: isUnverified ? 2 : 2,
          opacity: 1,
          fillOpacity: fillOpacity,
          dashArray: isUnverified ? '4' : '', // Dashed border for unverified
        })

        // Clean up title and description from encoding glitches dynamically
        const cleanTitle = (inc.title || '')
          .replace(/â€“/g, '–')
          .replace(/â€/g, '–')
          .replace(/â€™/g, "'")
          .replace(/Â/g, '');

        const cleanDesc = (inc.description || '')
          .replace(/â€“/g, '–')
          .replace(/â€/g, '–')
          .replace(/â€™/g, "'")
          .replace(/Â/g, '');

        const sourceUrl = inc.sources && inc.sources.length > 0 ? inc.sources[0].sourceUrl : null;
        const titleHtml = inc.title ? `<strong style="display:block; margin-bottom:6px; font-size:0.9rem; color:#1e293b; line-height:1.3;">${cleanTitle}</strong>` : '';
        const descHtml = inc.description ? `<p style="color:#475569; font-size:0.8rem; margin-bottom:8px; line-height:1.4;">${cleanDesc}</p>` : '';
        const sourceHtml = sourceUrl ? `<a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" style="color:#3b82f6; font-size:0.75rem; text-decoration:none; display:inline-block; margin-top:4px; font-weight:600;">Read Source ↗</a>` : '';

        // Verification UI
        let verifyHtml = '';
        if (inc.source === 'community') {
          if (!inc.isVerified) {
            verifyHtml = `
              <div style="margin-top: 10px; padding: 8px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px;">
                <p style="font-size: 0.7rem; color: #c2410c; margin-bottom: 6px; font-weight: 600;">⚠️ Unverified Report (${inc.confirmations}/3 confirmations)</p>
                <button onclick="window.confirmCommunityIncident('${inc.id}')" style="width: 100%; padding: 6px; background: #f97316; color: white; border: none; border-radius: 4px; font-size: 0.75rem; font-weight: bold; cursor: pointer;">
                  I can confirm this happened
                </button>
              </div>
            `;
          } else {
            verifyHtml = `
              <div style="margin-top: 10px; display: flex; align-items: center; gap: 4px;">
                <span style="color: #10b981; font-size: 0.75rem;">✓ Community Verified</span>
              </div>
            `;
          }
        } else if (inc.source === 'ncrb') {
           verifyHtml = `
              <div style="margin-top: 10px; display: flex; align-items: center; gap: 4px;">
                <span style="color: #3b82f6; font-size: 0.75rem; font-weight: 600;">🏛️ Official NCRB Data</span>
              </div>
            `;
        }

        marker.bindPopup(`
          <div style="font-family:'Inter', sans-serif; min-width:220px; max-width:260px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <strong style="color:${color}; text-transform:uppercase; letter-spacing:0.05em; font-size:0.75rem; padding: 2px 6px; background: ${color}20; border-radius: 4px; border: 1px solid ${color}40;">
                ${inc.type}
              </strong>
              <span style="color:#64748b; font-size:0.7rem;">
                ${new Date(inc.date).toLocaleDateString()}
              </span>
            </div>
            ${titleHtml}
            ${descHtml}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding-top:8px; border-top: 1px solid #e2e8f0;">
              <span style="color:#64748b; font-size:0.75rem;">📍 ${inc.city || 'Location'}</span>
              ${sourceHtml}
            </div>
            ${verifyHtml}
          </div>
        `)

        markersGroup.addLayer(marker)
      })
    }
  }, [filters, incidents, isHeatmap])

  return (
    <div className="absolute inset-0">
      {/* Map canvas */}
      <div ref={mapRef} className="absolute inset-0 z-[1]" />
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
        title="Toggle Heatmap"
      >
        <Layers size={18} className={isHeatmap ? 'text-cyan-500' : 'text-slate-400'} />
        <span className="text-sm font-medium">{isHeatmap ? 'Heatmap' : 'Pins'}</span>
      </button>

      {/* Locate Me Button */}
      <LocateMeButton mapRef={mapInstanceRef} />
      
      {/* Report Incident FAB */}
      <ReportFAB onClick={() => setIsReportModalOpen(true)} />
      
      {/* Report Modal */}
      <ReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        onReportSuccess={fetchIncidents}
      />
    </div>
  )
}