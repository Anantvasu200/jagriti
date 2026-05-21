import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from '../utils/apiConfig';
import {
  Map, Wallet, AlertCircle, Siren, Eye, Calendar, Search,
  ShieldAlert, Share2, Plus, Trash2, Phone, ChevronDown, ChevronUp,
  User, Signal, MapPin, CheckCircle, Loader2
} from 'lucide-react';

const CRIME_TYPES = [
  { value: 'all',        label: 'All Incidents', icon: Map,          accent: '#06b6d4' },
  { value: 'theft',      label: 'Theft',         icon: Wallet,       accent: '#f97316' },
  { value: 'harassment', label: 'Harassment',    icon: AlertCircle,  accent: '#f43f5e' },
  { value: 'assault',    label: 'Assault',       icon: Siren,        accent: '#ef4444' },
  { value: 'suspicious', label: 'Suspicious',    icon: Eye,          accent: '#eab308' },
]

const LEGEND = [
  { label: 'Theft',      color: '#f97316' },
  { label: 'Harassment', color: '#f43f5e' },
  { label: 'Assault',    color: '#ef4444' },
  { label: 'Suspicious', color: '#eab308' },
]





export default function Sidebar({ 
  filters, 
  setFilters, 
  isSharingLocation, 
  setIsSharingLocation, 
  userLocation, 
  locationStatus, 
  locationError,
  activeSOS,
  handleSosClick,
  isOpen,
  setIsOpen,
  routeDestination,
  setRouteDestination,
  routesData,
  setRoutesData,
  selectedRouteIndex,
  setSelectedRouteIndex,
  setShowAnonymousTipModal,
  setShowAuthModal,
  safeSpots = [],
  mapRef,
  loadingSafeSpots,
  currentUser,
  setCurrentUser
}) {
  const [localStartDate, setLocalStartDate] = useState(filters.startDate || '');
  const [localEndDate, setLocalEndDate] = useState(filters.endDate || '');

  // Route Geocoding state
  const [routeQuery, setRouteQuery] = useState('')
  const [routeSearchResults, setRouteSearchResults] = useState([])
  const [routeSearchLoading, setRouteSearchLoading] = useState(false)

  const routeDebounceRef = useRef(null)

  const searchRouteDestination = async (q) => {
    if (q.trim().length < 2) { setRouteSearchResults([]); return }
    setRouteSearchLoading(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      const data = await res.json()
      setRouteSearchResults(data)
    } catch {
      setRouteSearchResults([])
    } finally {
      setRouteSearchLoading(false)
    }
  }

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleSearch = (start, end) => {
    setFilters(f => ({ 
      ...f, 
      startDate: start, 
      endDate: end,
      searchTrigger: (f.searchTrigger || 0) + 1 
    }));
  };

  const setTodayFilter = () => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    setLocalStartDate(todayStr);
    setLocalEndDate(todayStr);
    handleSearch(todayStr, todayStr);
  };

  const clearDateFilter = () => {
    setLocalStartDate('');
    setLocalEndDate('');
    handleSearch('', '');
  };

  const shareLiveTrackingLink = async () => {
    if (!userLocation) return
    const userId = localStorage.getItem('jagriti_user_id')
    const shareUrl = `${window.location.origin}/?trackId=${userId}&lat=${userLocation.lat}&lng=${userLocation.lng}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: '🚨 JAGRITI LIVE TRACKING LINK 🚨',
          text: `You can monitor my live coordinate updates here.`,
          url: shareUrl,
        })
      } catch (err) {
        console.log('Share canceled:', err)
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl)
        alert('Live track link copied to clipboard!')
      } catch (err) {
        console.error('Failed to copy link:', err)
      }
    }
  }

  const toggleLocationSharing = () => {
    if (!isSharingLocation) {
      if (locationStatus === 'denied') {
        alert("🚨 Location Denied: Cannot start sharing. Please grant location access in your browser settings.")
      } else if (locationStatus === 'error' && locationError) {
        alert(`🚨 Location Error: ${locationError}`)
      } else if (locationStatus === 'loading' || !userLocation) {
        alert("🛰️ Acquiring GPS signal... Please wait a moment.")
      } else {
        setIsSharingLocation(true)
      }
    } else {
      setIsSharingLocation(false)
    }
  }

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden pointer-events-auto shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
      
      {/* 1. Header with App Info and GPS lock status */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600">
            <Signal size={16} />
          </div>
          <div>
            <span className="font-extrabold text-[0.8rem] uppercase tracking-wider text-slate-800 block">Guard Terminal</span>
            <span className="text-[0.65rem] text-slate-500">Jagriti Active Protection</span>
          </div>
        </div>

        {/* GPS Connection Status Badge */}
        {locationStatus === 'granted' && userLocation ? (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-emerald-600 text-[0.65rem] font-semibold">
            <MapPin size={10} />
            <span>GPS LOCKED</span>
          </div>
        ) : locationStatus === 'denied' ? (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full text-red-600 text-[0.65rem] font-semibold">
            <MapPin size={10} />
            <span>GPS BLOCKED</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-amber-600 text-[0.65rem] font-semibold animate-pulse">
            <MapPin size={10} />
            <span>ACQUIRING...</span>
          </div>
        )}
      </div>

      {/* 1.5. User Profile / Account Section */}
      <div className="px-4 py-3 border-b border-slate-150 bg-slate-50/50 flex items-center justify-between">
        {currentUser ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* User Avatar Circle */}
              <div className="w-9 h-9 rounded-full bg-cyan-100 border border-cyan-200 flex items-center justify-center text-cyan-700 font-extrabold text-sm shrink-0 uppercase">
                {currentUser.name ? currentUser.name[0] : currentUser.username[0]}
              </div>
              <div className="min-w-0">
                <span className="block text-[0.72rem] font-extrabold text-slate-800 leading-snug truncate">
                  {currentUser.name} {currentUser.surname || ''}
                </span>
                <span className="block text-[0.55rem] text-slate-500 font-bold truncate">
                  @{currentUser.username} {currentUser.role === 'admin' && '• Admin'}
                </span>
              </div>
            </div>
            
            <button
              onClick={() => {
                if (window.confirm(`Sign out ${currentUser.name || currentUser.username} from Jagriti Safety Network?`)) {
                  localStorage.removeItem('jagriti_token');
                  localStorage.removeItem('jagriti_user');
                  setCurrentUser(null);
                }
              }}
              className="text-[0.62rem] font-extrabold text-red-700 hover:text-white bg-red-50 hover:bg-red-600 px-2.5 py-1.5 rounded-lg border border-red-200 hover:border-red-600 transition-all duration-150 cursor-pointer shrink-0 uppercase tracking-wider shadow-sm"
              title="Sign Out"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full py-0.5">
            <div className="flex items-center gap-2 text-slate-500">
              <User size={16} />
              <span className="text-[0.68rem] font-extrabold uppercase tracking-wider text-slate-650">Anonymous Session</span>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-[0.62rem] font-extrabold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-950 transition-colors cursor-pointer shrink-0 uppercase tracking-wider shadow-sm"
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* 2. Scrollable Body containing actions and filters */}
      <nav className="flex-1 p-4 overflow-y-auto space-y-4 pt-4 custom-scrollbar">
        
        {/* --- Card 1: SOS Panic Trigger --- */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 ${
          activeSOS 
            ? 'bg-emerald-50 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
            : 'bg-red-50/50 border-red-200 shadow-[0_0_20px_rgba(239,68,68,0.02)] hover:bg-red-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className={activeSOS ? "text-emerald-600" : "text-red-600"} size={18} />
              <span className={`text-xs font-bold uppercase tracking-wider ${activeSOS ? 'text-emerald-700' : 'text-red-700'}`}>
                {activeSOS ? 'SOS Alert Broadcasting' : 'Emergency Assistance'}
              </span>
            </div>
            {activeSOS && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            )}
          </div>
          <button
            onClick={handleSosClick}
            className={`w-full py-2.5 rounded-xl text-xs font-extrabold tracking-wider transition-all duration-200 cursor-pointer shadow-sm ${
              activeSOS
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            {activeSOS ? '✓ I AM SAFE - CANCEL ALERT' : 'TRIGGER EMERGENCY SOS'}
          </button>
          
          <button
            onClick={() => {
              const token = localStorage.getItem('jagriti_token');
              if (!token) {
                setShowAuthModal(true);
              } else {
                setShowAnonymousTipModal(true);
              }
            }}
            className="w-full mt-2 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            Report Anonymous Tip
          </button>
        </div>

        {/* --- Card 2: Live Location Sharing --- */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 ${
          isSharingLocation 
            ? 'bg-cyan-50 border-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.1)]' 
            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Share2 className={isSharingLocation ? "text-cyan-600" : "text-slate-500"} size={18} />
              <span className={`text-xs font-bold uppercase tracking-wider ${isSharingLocation ? 'text-cyan-700' : 'text-slate-700'}`}>
                {isSharingLocation ? 'Live Tracking Active' : 'Live Location Sharing'}
              </span>
            </div>
            {isSharingLocation && (
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
            )}
          </div>


          <div className="flex gap-2">
            <button
              onClick={toggleLocationSharing}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                isSharingLocation
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm'
              }`}
            >
              {isSharingLocation ? 'Stop Sharing' : 'Start Sharing'}
            </button>
            
            {isSharingLocation && (
              <button
                onClick={shareLiveTrackingLink}
                className="px-3 bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                title="Copy Sharing Link"
              >
                <Share2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* --- Card 4: Safe Route Planner (Flat, non-collapsible) --- */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">Safe Route Planner</span>
          <div className="space-y-3">
            <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider block mb-1">Destination</span>
            <div className="relative">
              <input
                type="text"
                value={routeQuery}
                onChange={(e) => {
                  setRouteQuery(e.target.value);
                  clearTimeout(routeDebounceRef.current);
                  routeDebounceRef.current = setTimeout(() => searchRouteDestination(e.target.value), 350);
                }}
                placeholder="Enter destination address..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500/50"
              />
              {routeSearchLoading && (
                <div className="absolute right-3 top-2.5">
                  <span className="w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin block"></span>
                </div>
              )}

              {/* Autocomplete Dropdown - Absolute inside the relative container to overlay and prevent glitches */}
              {routeSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 z-50 bg-white border border-slate-250 rounded-xl overflow-hidden divide-y divide-slate-100 mt-1 max-h-[160px] overflow-y-auto shadow-lg">
                  {routeSearchResults.map((r, i) => (
                    <button
                      key={r.place_id ?? i}
                      onClick={() => {
                        const lat = parseFloat(r.lat);
                        const lng = parseFloat(r.lon);
                        setRouteDestination({ lat, lng, label: r.display_name.split(',')[0] });
                        setRouteQuery(r.display_name.split(',')[0]);
                        setRouteSearchResults([]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-[0.7rem] text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer border-none"
                    >
                      <MapPin size={12} className="text-cyan-600 shrink-0" />
                      <span className="truncate font-semibold text-[0.68rem]">{r.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {routeDestination && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[0.65rem] text-slate-500 font-bold">ROUTE COMPARISON</span>
                  <button
                    onClick={() => {
                      setRouteDestination(null);
                      setRouteQuery('');
                      setRoutesData([]);
                    }}
                    className="text-[0.65rem] font-bold text-red-600 hover:text-red-500 transition-colors uppercase cursor-pointer border-none bg-transparent"
                  >
                    Clear Route
                  </button>
                </div>

                {routesData.length === 0 ? (
                  <div className="text-[0.7rem] text-slate-500 py-1 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></span>
                    Calculating safest paths...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {routesData.map((route, idx) => {
                      const isSelected = selectedRouteIndex === idx;
                      const safety = route.safetyScore;
                      const safetyColor = safety >= 85 ? 'text-emerald-700' : safety >= 65 ? 'text-amber-700' : 'text-red-600';
                      const safetyBg = safety >= 85 ? 'bg-emerald-50' : safety >= 65 ? 'bg-amber-50' : 'bg-red-50';
                      const safetyBorder = safety >= 85 ? 'border-emerald-200' : safety >= 65 ? 'border-amber-200' : 'border-red-200';

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedRouteIndex(idx)}
                          className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                            isSelected 
                              ? 'bg-slate-100 border-cyan-500 shadow-sm' 
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-[0.7rem] font-bold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                              {idx === 0 ? 'Safest Path' : `Alternative Route ${idx}`}
                            </span>
                            <span className={`text-[0.65rem] font-extrabold px-1.5 py-0.5 rounded-full border ${safetyBg} ${safetyColor} ${safetyBorder}`}>
                              {safety}% SAFE
                            </span>
                          </div>
                          <div className="flex justify-between text-[0.65rem] text-slate-500 font-semibold">
                            <span>{(route.distance / 1000).toFixed(1)} km</span>
                            <span>{Math.round(route.duration / 60)} mins</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* --- Card 5: Incident Visualization Filters (Flat, non-collapsible) --- */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Incident Filters</span>
          
          <div>
            <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider block mb-2">Category</span>
            <ul className="flex flex-col gap-1 list-none p-0">
              {CRIME_TYPES.map(({ value, label, icon: Icon, accent }) => {
                const isActive = filters.crimeType === value;
                return (
                  <li key={value}>
                    <button 
                      onClick={() => setFilters(f => ({ ...f, crimeType: value }))}
                      className={`flex gap-3 font-semibold text-xs items-center w-full py-2 px-2.5 rounded-lg transition-all duration-200 cursor-pointer border-none
                        ${isActive ? 'bg-white border border-slate-200 text-slate-900 shadow-sm' : 'bg-transparent hover:bg-slate-100/50 text-slate-500'}
                      `}
                    >
                      <Icon className="h-4 w-4 shrink-0" style={{ color: isActive ? accent : '#64748b' }} />
                      <span>{label}</span>
                      <span className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`} style={{ background: accent }} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="border-t border-slate-200 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">Date Filter</span>
              <div className="flex gap-1.5">
                <button
                  onClick={setTodayFilter}
                  className="text-[0.62rem] font-extrabold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
                >
                  Today
                </button>
                {(localStartDate || localEndDate) && (
                  <button
                    onClick={clearDateFilter}
                    className="text-[0.62rem] font-extrabold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[0.55rem] text-slate-500 font-bold uppercase tracking-wider block mb-1">Start Date</span>
                <input
                  type="date"
                  value={localStartDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalStartDate(val);
                    handleSearch(val, localEndDate);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[0.68rem] text-slate-800 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <span className="text-[0.55rem] text-slate-500 font-bold uppercase tracking-wider block mb-1">End Date</span>
                <input
                  type="date"
                  value={localEndDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalEndDate(val);
                    handleSearch(localStartDate, val);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[0.68rem] text-slate-800 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider block mb-2">Data Source</span>
            <div className="flex bg-white p-1 rounded-xl gap-1 border border-slate-200">
              <button
                onClick={() => setFilters(f => ({ ...f, dataSource: 'both' }))}
                className={`flex-1 text-center py-1.5 px-1 rounded-lg text-[0.7rem] font-bold transition-all duration-200 cursor-pointer border-none
                  ${filters.dataSource === 'both' ? 'bg-slate-100 text-slate-800 shadow-sm border border-slate-200' : 'bg-transparent text-slate-500 hover:text-slate-700'}
                `}
              >
                Both
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, dataSource: 'live' }))}
                className={`flex-1 text-center py-1.5 px-1 rounded-lg text-[0.7rem] font-bold transition-all duration-200 cursor-pointer border-none
                  ${filters.dataSource === 'live' ? 'bg-slate-100 text-slate-800 shadow-sm border border-slate-200' : 'bg-transparent text-slate-500 hover:text-slate-700'}
                `}
              >
                Live Tips
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, dataSource: 'ncrb' }))}
                className={`flex-1 text-center py-1.5 px-1 rounded-lg text-[0.7rem] font-bold transition-all duration-200 cursor-pointer border-none
                  ${filters.dataSource === 'ncrb' ? 'bg-slate-100 text-slate-800 shadow-sm border border-slate-200' : 'bg-transparent text-slate-500 hover:text-slate-700'}
                `}
              >
                NCRB
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider block mb-2">Time of Day</span>
            <div className="flex bg-white p-1 rounded-xl gap-1 border border-slate-200">
              {['all', 'day', 'night'].map((time) => (
                <button
                  key={time}
                  onClick={() => setFilters(f => ({ ...f, timeOfDay: time }))}
                  className={`flex-1 text-center py-1.5 px-1 rounded-lg text-[0.7rem] font-bold transition-all duration-200 cursor-pointer border-none
                    ${filters.timeOfDay === time ? 'bg-slate-100 text-slate-800 shadow-sm border border-slate-200' : 'bg-transparent text-slate-500 hover:text-slate-700'}
                  `}
                >
                  {time === 'all' ? '24 Hours' : time === 'day' ? 'Day' : 'Night'}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider block mb-2">Safe Infrastructure</span>
            <label className="flex items-center gap-2 px-1 py-1 cursor-pointer hover:text-slate-800 text-slate-700 transition-colors">
              <input 
                type="checkbox"
                checked={filters.showSafeSpots || false}
                onChange={(e) => setFilters(f => ({ ...f, showSafeSpots: e.target.checked }))}
                className="rounded border-slate-350 bg-white text-emerald-600 focus:ring-emerald-500/50"
              />
              <span className="text-xs font-bold text-emerald-600">Show Nearby Safe Spots Layer</span>
            </label>

            {filters.showSafeSpots && (
              <div className="mt-3 flex flex-col gap-3">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">Search Radius</span>
                    <span className="text-[0.7rem] font-extrabold text-emerald-600">
                      {filters.safeSpotsRadius >= 1000 
                        ? `${(filters.safeSpotsRadius / 1000).toFixed(1)} km` 
                        : `${filters.safeSpotsRadius}m`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="2500"
                    step="500"
                    value={filters.safeSpotsRadius ?? 1000}
                    onChange={(e) => setFilters(f => ({ ...f, safeSpotsRadius: parseInt(e.target.value) }))}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="flex justify-between text-[0.55rem] text-slate-400 font-bold mt-1">
                    <span>500m</span>
                    <span>1.5km</span>
                    <span>2.5km</span>
                  </div>
                </div>

                {/* Nearby Places Proximity List */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <span className="text-[0.65rem] font-extrabold text-slate-500 uppercase tracking-wider mb-2">Nearest Safe places</span>
                  
                  {loadingSafeSpots ? (
                    <div className="flex flex-col gap-2 py-1">
                      <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-[0.6rem] uppercase tracking-wider animate-pulse mb-1">
                        <Loader2 className="animate-spin text-emerald-500" size={12} />
                        <span>Searching nearby safe spots...</span>
                      </div>
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 animate-pulse">
                          <div className="flex items-center gap-2 min-w-0 w-2/3">
                            <div className="w-5 h-5 rounded-full bg-slate-200 shrink-0" />
                            <div className="flex flex-col gap-1 w-full">
                              <div className="h-2 bg-slate-200 rounded w-5/6" />
                              <div className="h-1.5 bg-slate-200 rounded w-1/3" />
                            </div>
                          </div>
                          <div className="h-3.5 bg-slate-200 rounded w-8 shrink-0" />
                        </div>
                      ))}
                    </div>
                  ) : !userLocation ? (
                    <p className="text-[0.6rem] text-slate-450 leading-relaxed font-bold">
                      💡 Enable GPS location to calculate exact proximity distances to safe zones.
                    </p>
                  ) : safeSpots && safeSpots.length > 0 ? (
                    <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-0.5">
                      {[...safeSpots]
                        .filter(spot => spot.distanceKm !== null)
                        .sort((a, b) => a.distanceKm - b.distanceKm)
                        .slice(0, 5)
                        .map(spot => {
                          const distM = spot.distanceKm * 1000;
                          const formattedDistance = distM < 1000 
                            ? `${Math.round(distM)}m` 
                            : `${spot.distanceKm.toFixed(2)} km`;
                          
                          const spotEmojis = {
                            police: '🚓',
                            hospital: '🏥',
                            pharmacy: '💊',
                            metro: '🚇'
                          };

                          return (
                            <button
                              key={spot.id}
                              onClick={() => {
                                if (mapRef && mapRef.current) {
                                  mapRef.current.setView([spot.lat, spot.lng], 16);
                                }
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 text-left transition-all cursor-pointer group text-slate-800"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm shrink-0">
                                  {spotEmojis[spot.type] || '🛡️'}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-[0.68rem] font-extrabold truncate group-hover:text-emerald-700 leading-snug">
                                    {spot.name}
                                  </div>
                                  <div className="text-[0.55rem] text-slate-400 font-bold truncate capitalize leading-none mt-0.5">
                                    {spot.type}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[0.62rem] font-extrabold text-emerald-600 bg-emerald-50 group-hover:bg-white px-2 py-0.5 rounded border border-emerald-100/50 shrink-0">
                                {formattedDistance}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-[0.6rem] text-slate-450 leading-relaxed font-bold">
                      🚫 No safe places located within current radius. Zoom/pan map to load places.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-3 flex flex-col gap-2">
            <button
              onClick={() => window.open(`${API_BASE_URL}/api/reports/safety`, '_blank')}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm border-none"
            >
              Export Safety PDF Report
            </button>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500 block mb-2">Category Colors</span>
          <div className="grid grid-cols-2 gap-2">
            {LEGEND.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className="shrink-0 w-2 h-2 rounded-full"
                  style={{ background: color, boxShadow: `0 0 4px ${color}66` }}
                />
                <span className="text-[0.68rem] text-slate-600 font-semibold">{label}</span>
              </div>
            ))}
          </div>
        </div>

      </nav>
      
      <div className="p-4 border-t border-slate-200 bg-slate-50 md:hidden">
        <button 
          onClick={toggleSidebar}
          className="w-full font-bold text-xs py-2 text-center bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer shadow-sm"
        >
          Close Panel
        </button>
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-[1000] flex">
      
      {/* Mobile Menu Backdrop Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 pointer-events-auto cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* Mobile Menu Slide */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed inset-y-0 left-0 w-80 z-50 pointer-events-auto p-4 flex flex-col justify-end"
          >
            <div className="h-[90%] w-full">
              {renderSidebarContent()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar container */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="hidden md:block fixed top-[110px] left-4 bottom-4 w-80 z-50 pointer-events-auto"
          >
            <div className="h-full relative">
              {renderSidebarContent()}
              
              {/* Collapsing Pull-tab */}
              <button
                onClick={toggleSidebar}
                title="Collapse Panel"
                className="absolute -right-5 top-1/2 -translate-y-1/2 w-5 h-16 bg-white border border-slate-200 border-l-0 rounded-r-xl shadow-md flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-slate-50 hover:w-6 hover:-right-6 transition-all duration-200 group z-[-1]"
              >
                <div className="w-[3px] h-[3px] rounded-full bg-slate-300 group-hover:bg-cyan-505 transition-colors" />
                <div className="w-[3px] h-[3px] rounded-full bg-slate-300 group-hover:bg-cyan-550 transition-colors" />
                <div className="w-[3px] h-[3px] rounded-full bg-slate-300 group-hover:bg-cyan-550 transition-colors" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}