import { useState } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import './App.css'

function App() {
  const [filters, setFilters] = useState({
    crimeType: 'all',
    dateRange: '30days'
  })

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-brand">
          <span className="header-icon">🔦</span>
          <h1>Jagriti</h1>
          <span className="header-tagline">Know Your Surroundings. Stay Safe.</span>
        </div>
      </header>
      <div className="app-body">
        <Sidebar filters={filters} setFilters={setFilters} />
        <MapView filters={filters} />
      </div>
    </div>
  )
}

export default App