import './Sidebar.css'

const CRIME_TYPES = [
  { value: 'all', label: '🗺️ All Incidents' },
  { value: 'theft', label: '💰 Theft' },
  { value: 'harassment', label: '⚠️ Harassment' },
  { value: 'assault', label: '🚨 Assault' },
  { value: 'suspicious', label: '👁️ Suspicious' },
]

export default function Sidebar({ filters, setFilters }) {
  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <h3>Filter by Crime</h3>
        <div className="filter-buttons">
          {CRIME_TYPES.map(ct => (
            <button
              key={ct.value}
              className={`filter-btn ${filters.crimeType === ct.value ? 'active' : ''}`}
              onClick={() => setFilters(f => ({ ...f, crimeType: ct.value }))}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Date Range</h3>
        <select
          className="date-select"
          value={filters.dateRange}
          onChange={e => setFilters(f => ({ ...f, dateRange: e.target.value }))}
        >
          <option value="7days">Last 7 days</option>
          <option value="30days">Last 30 days</option>
          <option value="90days">Last 90 days</option>
          <option value="1year">Last 1 year</option>
        </select>
      </div>

      <div className="sidebar-section legend">
        <h3>Legend</h3>
        <div className="legend-item"><span style={{background:'#f97316'}} />Theft</div>
        <div className="legend-item"><span style={{background:'#ef4444'}} />Harassment</div>
        <div className="legend-item"><span style={{background:'#dc2626'}} />Assault</div>
        <div className="legend-item"><span style={{background:'#eab308'}} />Suspicious</div>
      </div>
    </div>
  )
}