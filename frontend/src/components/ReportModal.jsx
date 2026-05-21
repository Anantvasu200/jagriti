import { useState, useEffect } from 'react'
import { X, MapPin, Loader2, AlertTriangle } from 'lucide-react'
import { API_BASE_URL } from '../utils/apiConfig'

export default function ReportModal({ isOpen, onClose, onReportSuccess, userLocation }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'suspicious',
    city: '',
    lat: '',
    lng: ''
  })
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')

  // Auto-fill user coordinates instantly when modal opens
  useEffect(() => {
    if (isOpen && userLocation) {
      setFormData(prev => ({
        ...prev,
        lat: userLocation.lat.toFixed(6),
        lng: userLocation.lng.toFixed(6)
      }))
    }
  }, [isOpen, userLocation])

  if (!isOpen) return null

  const handleGetLocation = () => {
    setLocating(true)
    setError('')

    // If userLocation is already tracked, retrieve it instantly
    if (userLocation) {
      setFormData(prev => ({
        ...prev,
        lat: userLocation.lat.toFixed(6),
        lng: userLocation.lng.toFixed(6)
      }))
      setLocating(false)
      return
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6)
        }))
        setLocating(false)
      },
      () => {
        setError('Unable to retrieve your location')
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 5000 }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.lat || !formData.lng) {
      setError('Please provide a location (lat/lng)')
      return
    }
    setLoading(true)
    setError('')

    try {
      // Get or create anonymous userId
      let userId = localStorage.getItem('jagriti_user_id')
      if (!userId) {
        userId = 'anon_' + Math.random().toString(36).substring(2, 15)
        localStorage.setItem('jagriti_user_id', userId)
      }

      const response = await fetch(`${API_BASE_URL}/api/incidents/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userId })
      })
      const data = await response.json()
      
      if (data.status === 'success') {
        onReportSuccess()
        onClose()
      } else {
        setError(data.message || 'Failed to submit report')
      }
    } catch (err) {
      setError('Network error. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div className="
        w-full max-w-lg
        bg-white border border-slate-200
        rounded-2xl shadow-2xl overflow-hidden
        flex flex-col
      ">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-orange-500 animate-pulse" size={20} />
            <h2 className="text-lg font-bold text-slate-800">Report an Incident</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {error && (
            <div className="text-sm text-red-650 bg-red-50 border border-red-100 px-3 py-2 rounded-lg font-semibold">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">Title</label>
            <input 
              required
              type="text" 
              placeholder="E.g., Stolen Bicycle, Suspicious Activity"
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-orange-500 placeholder-slate-400 transition-colors"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">Type</label>
              <select 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-orange-500 appearance-none transition-colors"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="theft">Theft</option>
                <option value="harassment">Harassment</option>
                <option value="assault">Assault</option>
                <option value="suspicious">Suspicious</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">City</label>
              <input 
                type="text" 
                placeholder="E.g., New Delhi"
                className="bg-slate-50 md:bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-orange-500 placeholder-slate-400 transition-colors"
                value={formData.city}
                onChange={e => setFormData({...formData, city: e.target.value})}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">Location (Lat / Lng)</label>
            <div className="flex gap-2">
              <input 
                required
                type="number" step="any"
                placeholder="Latitude"
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-orange-500 flex-1 min-w-0 placeholder-slate-400 transition-colors"
                value={formData.lat}
                onChange={e => setFormData({...formData, lat: e.target.value})}
              />
              <input 
                required
                type="number" step="any"
                placeholder="Longitude"
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-orange-500 flex-1 min-w-0 placeholder-slate-400 transition-colors"
                value={formData.lng}
                onChange={e => setFormData({...formData, lng: e.target.value})}
              />
              <button 
                type="button"
                onClick={handleGetLocation}
                disabled={locating}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer shrink-0 border border-slate-950 shadow-sm"
                title="Get Current Location"
              >
                {locating ? <Loader2 size={18} className="animate-spin text-orange-500" /> : <MapPin size={18} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">Description</label>
            <textarea 
              rows={3}
              placeholder="Provide any additional details..."
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-orange-500 resize-none placeholder-slate-400 transition-colors"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 shadow-md border-none"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  )
}
