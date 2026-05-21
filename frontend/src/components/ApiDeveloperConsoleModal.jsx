import { useState, useEffect } from 'react'
import { X, Key, Terminal, Code, Copy, Check, ShieldCheck, HelpCircle } from 'lucide-react'
import { API_BASE_URL } from '../utils/apiConfig'

export default function ApiDeveloperConsoleModal({ isOpen, onClose }) {
  const [developerName, setDeveloperName] = useState('')
  const [generatedKey, setGeneratedKey] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  
  useEffect(() => {
    if (!isOpen) {
      setDeveloperName('')
      setGeneratedKey(null)
      setCopied(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleGenerateKey = async (e) => {
    e.preventDefault()
    if (!developerName.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/developer/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ developerName })
      })
      const data = await response.json()
      if (data.status === 'success') {
        setGeneratedKey(data.data.key)
      } else {
        alert(data.message || 'Key generation failed')
      }
    } catch (err) {
      console.error('API key generation error:', err)
      alert('Failed to connect to the developer key service.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!generatedKey) return
    navigator.clipboard.writeText(generatedKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-6 text-slate-200 max-h-[85vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-cyan-500" />
            <h3 className="text-sm font-black tracking-tight uppercase text-white">
              Jagriti Developer Platform
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          
          {/* Left Column: Key Generation */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                <Key size={14} className="text-cyan-500" />
                <span>API Key Generator</span>
              </div>
              <p className="text-[0.65rem] text-slate-400 leading-relaxed">
                Register your research project, NGO, or application to generate a rate-limited access token.
              </p>

              {!generatedKey ? (
                <form onSubmit={handleGenerateKey} className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[0.58rem] font-bold text-slate-500 uppercase">Developer / Org Name</label>
                    <input
                      type="text"
                      required
                      value={developerName}
                      onChange={(e) => setDeveloperName(e.target.value)}
                      placeholder="e.g. SafeCity Alliance..."
                      className="w-full bg-slate-950 border border-white/5 rounded-lg px-2.5 py-1.5 text-[0.7rem] text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !developerName.trim()}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-bold py-1.5 rounded-lg text-[0.7rem] uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    {loading ? 'Creating...' : 'Generate Token'}
                  </button>
                </form>
              ) : (
                <div className="space-y-3 pt-2">
                  <div className="p-2.5 bg-cyan-950/20 border border-cyan-500/30 rounded-lg text-[0.65rem] text-cyan-400 font-mono break-all flex items-center justify-between gap-1">
                    <span>{generatedKey}</span>
                    <button 
                      onClick={handleCopy}
                      className="text-cyan-400 hover:text-white shrink-0 cursor-pointer"
                    >
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-[0.58rem] text-rose-400 font-bold leading-normal">
                    ⚠️ Copy this key now. It will not be shown again for security reasons.
                  </p>
                  <button
                    onClick={() => setGeneratedKey(null)}
                    className="w-full bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-1 rounded-lg text-[0.65rem] uppercase transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Quick Policy Specs */}
            <div className="bg-slate-950/20 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center gap-1 text-[0.68rem] font-bold text-white uppercase">
                <ShieldCheck size={13} className="text-emerald-500" />
                <span>Default Rate Limits</span>
              </div>
              <ul className="text-[0.58rem] text-slate-400 space-y-1 list-disc pl-3.5 leading-relaxed">
                <li>Rate Limit: 500 queries per hour per token.</li>
                <li>Anonymous access is forbidden for public datasets.</li>
                <li>Coordinate formats returned follow EPSG:4326 standards.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Documentation */}
          <div className="md:col-span-3 space-y-4">
            <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-3 h-full">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                <Code size={14} className="text-cyan-500" />
                <span>API Documentation (v1)</span>
              </div>

              {/* Endpoint Card */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="bg-cyan-900/50 text-cyan-300 px-2 py-0.5 rounded text-[0.58rem] font-bold">GET</span>
                  <span className="font-mono text-[0.68rem] text-white">/api/v1/incidents</span>
                </div>
                <p className="text-[0.6rem] text-slate-400">
                  Retrieve safety incidents database with category filtering support.
                </p>

                {/* Headers Table */}
                <div className="space-y-1 pt-1">
                  <div className="text-[0.58rem] font-bold text-slate-400 uppercase tracking-wide">Request Parameters</div>
                  <div className="bg-slate-950/80 rounded-lg p-2 border border-white/5 font-mono text-[0.58rem] text-slate-350 space-y-1.5">
                    <div>
                      <span className="text-white">x-api-key</span> <span className="text-slate-500">(Header)</span>
                      <p className="text-slate-400 text-[0.52rem] pl-2">Required. Your developer credentials key.</p>
                    </div>
                    <div className="border-t border-white/5 pt-1">
                      <span className="text-white">apiKey</span> <span className="text-slate-500">(Query param alternative)</span>
                      <p className="text-slate-400 text-[0.52rem] pl-2">e.g. ?apiKey=jg_live_...</p>
                    </div>
                    <div className="border-t border-white/5 pt-1">
                      <span className="text-white">type</span> <span className="text-slate-500">(Query parameter)</span>
                      <p className="text-slate-400 text-[0.52rem] pl-2">Optional. Filter by type (theft, harassment, assault, suspicious).</p>
                    </div>
                  </div>
                </div>

                {/* Sample Shell Command */}
                <div className="space-y-1 pt-1">
                  <div className="text-[0.58rem] font-bold text-slate-400 uppercase tracking-wide">Sample Integration</div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-white/5 font-mono text-[0.55rem] text-slate-300 overflow-x-auto leading-relaxed">
                    <div>curl -H <span className="text-emerald-400">"x-api-key: YOUR_API_KEY"</span> \</div>
                    <div className="pl-5">{`${API_BASE_URL || window.location.origin}/api/v1/incidents?type=harassment`}</div>
                  </div>
                </div>

                {/* Response Code Block */}
                <div className="space-y-1 pt-1">
                  <div className="text-[0.58rem] font-bold text-slate-400 uppercase tracking-wide">JSON Response Format</div>
                  <pre className="bg-slate-950 p-2.5 rounded-lg border border-white/5 font-mono text-[0.52rem] text-slate-300 overflow-x-auto leading-relaxed max-h-[120px] overflow-y-auto">
{`{
  "status": "success",
  "data": [
    {
      "id": "76d8-...",
      "title": "Unlit zone alert",
      "type": "suspicious",
      "location": {
        "type": "Point",
        "coordinates": [77.1025, 28.7041]
      },
      "city": "Delhi NCR",
      "isVerified": true,
      "date": "2026-05-20T10:48:00Z"
    }
  ]
}`}
                  </pre>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
