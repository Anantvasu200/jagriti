import { useState } from 'react'
import { X, MapPin, Loader2, AlertTriangle } from 'lucide-react'

export default function ReportModal({ isOpen, onClose, onReportSuccess }) {
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

  if (!isOpen) return null

  const handleGetLocation = () => {
    setLocating(true)
    setError('')
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
      }
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

      const response = await fetch('http://localhost:5000/api/incidents/report', {
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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="
        w-full max-w-lg
        bg-slate-900 border border-white/10
        rounded-2xl shadow-2xl overflow-hidden
        flex flex-col
      ">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-orange-500" size={20} />
            <h2 className="text-lg font-bold text-slate-100">Report an Incident</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Title</label>
            <input 
              required
              type="text" 
              placeholder="E.g., Stolen Bicycle, Suspicious Activity"
              className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</label>
              <select 
                className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 appearance-none"
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
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">City</label>
              <input 
                type="text" 
                placeholder="E.g., New Delhi"
                className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                value={formData.city}
                onChange={e => setFormData({...formData, city: e.target.value})}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location (Lat / Lng)</label>
            <div className="flex gap-2">
              <input 
                required
                type="number" step="any"
                placeholder="Latitude"
                className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 flex-1 min-w-0"
                value={formData.lat}
                onChange={e => setFormData({...formData, lat: e.target.value})}
              />
              <input 
                required
                type="number" step="any"
                placeholder="Longitude"
                className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 flex-1 min-w-0"
                value={formData.lng}
                onChange={e => setFormData({...formData, lng: e.target.value})}
              />
              <button 
                type="button"
                onClick={handleGetLocation}
                disabled={locating}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Get Current Location"
              >
                {locating ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
            <textarea 
              rows={3}
              placeholder="Provide any additional details..."
              className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 resize-none"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  )
}
