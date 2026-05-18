import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, Loader2, MapPin } from 'lucide-react'

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

export default function SearchBar({ mapRef }) {
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [open, setOpen]           = useState(false)
  const [focused, setFocused]     = useState(false)
  const inputRef                  = useRef(null)
  const debounceRef               = useRef(null)
  const containerRef              = useRef(null)

  /* ── Geocode via Nominatim ──────────────────────────────────── */
  const search = useCallback(async (q) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const url = `${NOMINATIM}?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      const data = await res.json()
      setResults(data)
      setOpen(data.length > 0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Debounce input ─────────────────────────────────────────── */
  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 350)
  }

  /* ── Select result → fly map ────────────────────────────────── */
  const handleSelect = (result) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    const map = mapRef.current
    if (map) {
      const bbox = result.boundingbox
      if (bbox) {
        map.flyToBounds(
          [[parseFloat(bbox[0]), parseFloat(bbox[2])],
           [parseFloat(bbox[1]), parseFloat(bbox[3])]],
          { duration: 1.2, padding: [40, 40] }
        )
      } else {
        map.flyTo([lat, lon], 13, { duration: 1.2 })
      }
    }
    setQuery(result.display_name.split(',')[0])
    setOpen(false)
    setResults([])
    inputRef.current?.blur()
  }

  /* ── Close dropdown on outside click ───────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const clear = () => {
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div
      ref={containerRef}
      className="relative z-[1000] w-full min-w-[280px]"
    >
      {/* ── Input pill ───────────────────────────────────── */}
      <div className={`
        flex items-center gap-2.5
        rounded-2xl border
        bg-gray-50
        px-4 py-2.5
        shadow-sm transition-all duration-200
        ${focused
          ? 'border-cyan-500/40 shadow-md'
          : 'border-gray-200 hover:border-gray-300'
        }
      `}>
        {loading
          ? <Loader2 size={16} className="text-cyan-600 shrink-0 animate-spin" />
          : <Search size={16} className="text-gray-500 shrink-0" />
        }

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { setFocused(true); if (results.length) setOpen(true) }}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === 'Escape' && clear()}
          placeholder="Search city or area…"
          className="
            flex-1 bg-transparent text-sm text-gray-800
            placeholder:text-gray-400
            outline-none border-none
            font-medium
          "
        />

        {query && (
          <button
            onClick={clear}
            className="text-gray-400 hover:text-gray-700 transition-colors duration-150 shrink-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Dropdown results ─────────────────────────────── */}
      {open && results.length > 0 && (
        <div className="
          mt-2 rounded-2xl overflow-hidden
          border border-gray-200
          bg-white shadow-xl
          divide-y divide-gray-100
        ">
          {results.map((r, i) => {
            const primary   = r.display_name.split(',')[0]
            const secondary = r.display_name.split(',').slice(1, 3).join(',').trim()
            return (
              <button
                key={r.place_id ?? i}
                onMouseDown={() => handleSelect(r)}
                className="
                  w-full flex items-start gap-3 px-4 py-3
                  text-left cursor-pointer
                  hover:bg-gray-50
                  transition-colors duration-150
                  group
                "
              >
                <MapPin
                  size={14}
                  className="text-cyan-600 group-hover:text-cyan-500 shrink-0 mt-0.5 transition-colors duration-150"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-gray-800 truncate">
                    {primary}
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                    {secondary}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
