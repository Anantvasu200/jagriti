import { useState, useEffect, useRef } from 'react'
import { X, ShieldAlert, CheckCircle2, AlertTriangle, Loader2, MapPin } from 'lucide-react'
import { API_BASE_URL } from '../utils/apiConfig'

export default function AnonymousTipModal({ isOpen, onClose, userLocation, showNotification, refreshIncidents }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('suspicious')
  const [useCurrentLocation, setUseCurrentLocation] = useState(true)
  
  // Custom location search fields
  const [locQuery, setLocQuery] = useState('')
  const [locResults, setLocResults] = useState([])
  const [locLoading, setLocLoading] = useState(false)
  const [selectedCoords, setSelectedCoords] = useState(null)
  
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const searchDebounceRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      // Reset form states
      setTitle('')
      setDescription('')
      setType('suspicious')
      setUseCurrentLocation(true)
      setLocQuery('')
      setLocResults([])
      setSelectedCoords(null)
      setSuccess(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Geocoder lookup for custom location
  const searchLocation = async (q) => {
    if (q.trim().length < 2) { setLocResults([]); return }
    setLocLoading(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      const data = await res.json()
      setLocResults(data)
    } catch {
      setLocResults([])
    } finally {
      setLocLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    let lat, lng, city = 'Unknown Area'
    
    if (useCurrentLocation) {
      if (!userLocation) {
        alert("⚠️ GPS location is currently unavailable. Please search for an address instead.")
        return
      }
      lat = userLocation.lat
      lng = userLocation.lng
    } else {
      if (!selectedCoords) {
        alert("⚠️ Please search and select an address from the results.")
        return
      }
      lat = selectedCoords.lat
      lng = selectedCoords.lng
      city = selectedCoords.label
    }

    setSubmitting(true)
    
    // Generate true anonymous user footprint ID
    const anonUserId = 'anon_tip_' + Math.random().toString(36).substring(2, 12)

    try {
      const response = await fetch(`${API_BASE_URL}/api/incidents/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || `Anonymous ${type} Tip`,
          description,
          type,
          lat,
          lng,
          city,
          userId: anonUserId
        })
      })

      const data = await response.json()
      if (data.status === 'success') {
        setSuccess(true)
        if (showNotification) showNotification('Anonymous Tip submitted successfully!')
        if (refreshIncidents) refreshIncidents()
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        alert(data.message || 'Submission failed')
      }
    } catch (err) {
      console.error('Anonymous tip upload error:', err)
      alert('Network error submitting anonymous tip')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-6 text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-cyan-500" />
            <h3 className="text-sm font-black tracking-tight uppercase text-white">
              Secure Anonymous Tip
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 size={24} className="text-emerald-400" />
            </div>
            <h4 className="text-sm font-bold text-white">Tip Submitted Anonymously</h4>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Thank you for contributing. Your report has been registered and is visible on the safety map.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Disclaimer */}
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-[0.65rem] text-cyan-400 flex gap-2.5 leading-relaxed">
              <ShieldAlert size={20} className="shrink-0 mt-0.5" />
              <div>
                <strong>Zero-Trace Policy:</strong> We do not log IP addresses, device headers, or coordinate history. Your metadata is stripped before caching to database.
              </div>
            </div>

            {/* Tip Subject */}
            <div className="space-y-1">
              <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider">
                Title / Short Subject
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Broken streetlights, suspicious loitering..."
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Crime Category */}
            <div className="space-y-1">
              <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider">
                Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
              >
                <option value="suspicious">⚠️ Suspicious Activity</option>
                <option value="harassment">🔴 Harassment</option>
                <option value="theft">🟠 Theft / Robbery</option>
                <option value="assault">🚨 Assault / Violence</option>
                <option value="other">⚪ Other Concern</option>
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider">
                Describe Incident
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe details, vehicle types, exact spot, timestamps..."
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
              />
            </div>

            {/* Location selector */}
            <div className="space-y-2">
              <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider block">
                Incident Location
              </label>
              <div className="flex bg-slate-950 p-1 rounded-xl gap-1 border border-white/5">
                <button
                  type="button"
                  onClick={() => setUseCurrentLocation(true)}
                  className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer
                    ${useCurrentLocation ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-400'}
                  `}
                >
                  GPS Position
                </button>
                <button
                  type="button"
                  onClick={() => setUseCurrentLocation(false)}
                  className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer
                    ${!useCurrentLocation ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-400'}
                  `}
                >
                  Search Address
                </button>
              </div>

              {useCurrentLocation ? (
                <div className="text-[0.68rem] text-slate-400 px-1 py-1 flex items-center gap-1.5">
                  <MapPin size={12} className="text-cyan-500 shrink-0" />
                  <span>
                    {userLocation 
                      ? `Coordinates detected: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
                      : '🛰️ Acquiring GPS location signal...'}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={locQuery}
                      onChange={(e) => {
                        setLocQuery(e.target.value)
                        clearTimeout(searchDebounceRef.current)
                        searchDebounceRef.current = setTimeout(() => searchLocation(e.target.value), 350)
                      }}
                      placeholder="Search neighborhood, street, or city..."
                      className="w-full bg-slate-950 border border-white/5 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                    {locLoading && (
                      <div className="absolute right-3 top-2.5">
                        <Loader2 size={14} className="text-cyan-500 animate-spin" />
                      </div>
                    )}
                  </div>

                  {locResults.length > 0 && (
                    <div className="bg-slate-950 border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5 max-h-[120px] overflow-y-auto">
                      {locResults.map((r, i) => (
                        <button
                          key={r.place_id ?? i}
                          type="button"
                          onClick={() => {
                            const lat = parseFloat(r.lat)
                            const lng = parseFloat(r.lon)
                            setSelectedCoords({ lat, lng, label: r.display_name.split(',')[0] })
                            setLocQuery(r.display_name.split(',')[0])
                            setLocResults([])
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-800/40 text-[0.7rem] text-slate-300 transition-colors truncate flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="text-cyan-400">📍</span>
                          <span className="truncate">{r.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedCoords && (
                    <div className="text-[0.68rem] text-emerald-400 px-1 py-1 flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span className="truncate">Selected: {selectedCoords.label}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-white/5 hover:bg-slate-800 text-slate-350 hover:text-white transition-all duration-150 py-2.5 rounded-xl text-xs font-bold cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white transition-all duration-150 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Tip'
                )}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  )
}
