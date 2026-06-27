import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from '../utils/apiConfig';
import {
  Map, Wallet, AlertCircle, Siren, Eye, Calendar, Search,
  ShieldAlert, Share2, Plus, Trash2, Phone, ChevronDown, ChevronUp,
  User, Signal, MapPin, CheckCircle, Loader2, X, Menu
} from 'lucide-react';
import Globe3DDemo from "./3d-globe-demo";


const CRIME_TYPES = [
  { value: 'all',        label: 'All Incidents', labelHi: 'सभी घटनाएं', icon: Map,          accent: '#06b6d4' },
  { value: 'theft',      label: 'Theft',         labelHi: 'चोरी',         icon: Wallet,       accent: '#f97316' },
  { value: 'harassment', label: 'Harassment',    labelHi: 'उत्पीड़न',    icon: AlertCircle,  accent: '#f43f5e' },
  { value: 'assault',    label: 'Assault',       labelHi: 'हमला',        icon: Siren,        accent: '#ef4444' },
  { value: 'suspicious', label: 'Suspicious',    labelHi: 'संदिग्ध',      icon: Eye,          accent: '#eab308' },
]

// Language dictionary
const t = {
  en: {
    terminal: 'Guard Terminal',
    activeProtection: 'Jagriti Active Protection',
    gpsLocked: 'GPS LOCKED',
    gpsBlocked: 'GPS BLOCKED',
    acquiring: 'ACQUIRING...',
    anonymousSession: 'Anonymous Session',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    emergencySos: 'Emergency Assistance',
    sosBroadcasting: 'SOS Alert Broadcasting',
    triggerSos: 'TRIGGER EMERGENCY SOS',
    safeCancel: '✓ I AM SAFE - CANCEL ALERT',
    reportTip: 'Report Anonymous Tip',
    liveLocation: 'Live Location Sharing',
    trackingActive: 'Live Tracking Active',
    startSharing: 'Start Sharing',
    stopSharing: 'Stop Sharing',
    routePlanner: 'Safe Route Planner',
    destination: 'Destination',
    destPlaceholder: 'Enter destination address...',
    calculatingPaths: 'Calculating safest paths...',
    clearRoute: 'Clear Route',
    routeComparison: 'Route Comparison',
    safestPath: 'Safest Path',
    alternative: 'Alternative Route',
    safeLevel: 'SAFE',
    incidentFilters: 'Incident Filters',
    category: 'Category',
    dateFilter: 'Date Filter',
    today: 'Today',
    clear: 'Clear',
    startDate: 'Start Date',
    endDate: 'End Date',
    dataSource: 'Data Source',
    both: 'Both',
    liveTips: 'Live Tips',
    ncrb: 'NCRB',
    timeOfDay: 'Time of Day',
    hours24: '24 Hours',
    day: 'Day',
    night: 'Night',
    safeInfra: 'Safe Infrastructure',
    showNearby: 'Show Nearby Safe Spots Layer',
    searchRadius: 'Search Radius',
    nearestSafe: 'Nearest Safe Places',
    searchingSpots: 'Searching nearby safe spots...',
    noPlaces: '🚫 No safe places located within current radius. Click search to load places.',
    enableGpsPrompt: '💡 Enable GPS location to calculate exact proximity distances to safe zones.',
    closePanel: 'Close Panel',
    searchThisArea: '🔍 Search This Area',
    preferredLanguage: 'Preferred Language'
  },
  hi: {
    terminal: 'सुरक्षा टर्मिनल',
    activeProtection: 'जागृति सक्रिय सुरक्षा',
    gpsLocked: 'जीपीएस लॉक',
    gpsBlocked: 'जीपीएस अवरुद्ध',
    acquiring: 'खोज रहा है...',
    anonymousSession: 'अनाम सत्र',
    signIn: 'साइन इन',
    signOut: 'लॉगआउट',
    emergencySos: 'आपातकालीन सहायता',
    sosBroadcasting: 'एसओएस अलर्ट सक्रिय',
    triggerSos: 'एसओएस आपातकाल सक्रिय करें',
    safeCancel: '✓ मैं सुरक्षित हूँ - रद्द करें',
    reportTip: 'अनाम सुरक्षा रिपोर्ट दर्ज करें',
    liveLocation: 'लोकेशन शेयरिंग',
    trackingActive: 'लाइव ट्रैकिंग सक्रिय',
    startSharing: 'लोकेशन शेयर करें',
    stopSharing: 'शेयर करना बंद करें',
    routePlanner: 'सुरक्षित मार्ग योजनाकार',
    destination: 'गंतव्य',
    destPlaceholder: 'गंतव्य का पता दर्ज करें...',
    calculatingPaths: 'सुरक्षित रास्तों की गणना की जा रही है...',
    clearRoute: 'मार्ग साफ करें',
    routeComparison: 'मार्ग तुलना',
    safestPath: 'सबसे सुरक्षित रास्ता',
    alternative: 'वैकल्पिक मार्ग',
    safeLevel: 'सुरक्षित',
    incidentFilters: 'घटना फिल्टर',
    category: 'श्रेणी',
    dateFilter: 'दिनांक फिल्टर',
    today: 'आज',
    clear: 'साफ करें',
    startDate: 'प्रारंभ तिथि',
    endDate: 'अंतिम तिथि',
    dataSource: 'डेटा स्रोत',
    both: 'दोनों',
    liveTips: 'लाइव टिप्स',
    ncrb: 'एनसीआरबी (NCRB)',
    timeOfDay: 'दिन का समय',
    hours24: '24 घंटे',
    day: 'दिन',
    night: 'रात',
    safeInfra: 'सुरक्षित बुनियादी ढांचा',
    showNearby: 'आस-पास के सुरक्षित स्थल दिखाएं',
    searchRadius: 'खोज त्रिज्या',
    nearestSafe: 'निकटतम सुरक्षित स्थान',
    searchingSpots: 'सुरक्षित स्थानों की खोज की जा रही है...',
    noPlaces: '🚫 वर्तमान त्रिज्या में कोई सुरक्षित स्थान नहीं मिला। खोजने के लिए क्लिक करें।',
    enableGpsPrompt: '💡 सुरक्षित क्षेत्रों के सटीक दूरी की गणना के लिए जीपीएस ऑन करें।',
    closePanel: 'पैनल बंद करें',
    searchThisArea: '🔍 इस क्षेत्र में खोजें',
    preferredLanguage: 'भाषा का चयन'
  }
};

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
  setCurrentUser,
  language = 'en',
  setLanguage
}) {
  const [localStartDate, setLocalStartDate] = useState(filters.startDate || '');
  const [localEndDate, setLocalEndDate] = useState(filters.endDate || '');

  // Debounce Safe Spots Radius changes
  const [localRadius, setLocalRadius] = useState(filters.safeSpotsRadius || 1000);
  const radiusDebounceRef = useRef(null);

  // Route Geocoding state
  const [routeQuery, setRouteQuery] = useState('')
  const [routeSearchResults, setRouteSearchResults] = useState([])
  const [routeSearchLoading, setRouteSearchLoading] = useState(false)

  const routeDebounceRef = useRef(null)

  const { t: i18nT } = useTranslation();
  const selectT = new Proxy({}, {
    get(target, prop) {
      const categories = ['header', 'map', 'heatmap', 'filters', 'safetyScore', 'community', 'aiAssistant', 'sos', 'navigation'];
      for (const cat of categories) {
        const key = `${cat}.${prop}`;
        const val = i18nT(key);
        if (val !== key) return val;
      }
      return i18nT(prop);
    }
  });

  // Sync radius back from filters if updated externally
  useEffect(() => {
    setLocalRadius(filters.safeSpotsRadius || 1000);
  }, [filters.safeSpotsRadius]);

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
            <span className="font-extrabold text-[0.8rem] uppercase tracking-wider text-slate-800 block">{selectT.terminal}</span>
            <span className="text-[0.65rem] text-slate-500">{selectT.activeProtection}</span>
          </div>
        </div>

        {/* GPS Connection Status Badge */}
        {locationStatus === 'granted' && userLocation ? (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-emerald-600 text-[0.65rem] font-semibold">
            <MapPin size={10} />
            <span>{selectT.gpsLocked}</span>
          </div>
        ) : locationStatus === 'denied' ? (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full text-red-600 text-[0.65rem] font-semibold">
            <MapPin size={10} />
            <span>{selectT.gpsBlocked}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-amber-600 text-[0.65rem] font-semibold animate-pulse">
            <MapPin size={10} />
            <span>{selectT.acquiring}</span>
          </div>
        )}
      </div>

      {/* 1.5. User Profile / Account Section & Bilingual selector */}
      <div className="px-4 py-3 border-b border-slate-150 bg-slate-50/50 flex flex-col gap-2.5">
        <div className="flex items-center justify-between w-full">
          {currentUser ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5 min-w-0">
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
                  if (window.confirm(language === 'hi' ? `क्या आप जागृति नेटवर्क से साइन आउट करना चाहते हैं?` : `Sign out from Jagriti Safety Network?`)) {
                    localStorage.removeItem('jagriti_token');
                    localStorage.removeItem('jagriti_user');
                    setCurrentUser(null);
                  }
                }}
                className="text-[0.62rem] font-extrabold text-red-700 hover:text-white bg-red-50 hover:bg-red-600 px-2.5 py-1.5 rounded-lg border border-red-200 hover:border-red-600 transition-all duration-150 cursor-pointer shrink-0 uppercase tracking-wider shadow-sm"
              >
                {selectT.signOut}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full py-0.5">
              <div className="flex items-center gap-2 text-slate-500">
                <User size={16} />
                <span className="text-[0.68rem] font-extrabold uppercase tracking-wider text-slate-655">{selectT.anonymousSession}</span>
              </div>
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-[0.62rem] font-extrabold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-950 transition-colors cursor-pointer shrink-0 uppercase tracking-wider shadow-sm"
              >
                {selectT.signIn}
              </button>
            </div>
          )}
        </div>

        {/* Bilingual Language Selector */}
        <div className="flex items-center justify-between border-t border-slate-200/50 pt-2.5 mt-0.5">
          <span className="text-[0.62rem] font-extrabold uppercase tracking-wider text-slate-500">
            {selectT.preferredLanguage}
          </span>
          <div className="flex bg-white p-0.5 rounded-lg gap-0.5 border border-slate-200 shadow-sm shrink-0">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-md text-[0.65rem] font-extrabold transition-all cursor-pointer border-none
                ${language === 'en' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'}
              `}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`px-2.5 py-1 rounded-md text-[0.65rem] font-extrabold transition-all cursor-pointer border-none
                ${language === 'hi' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'}
              `}
            >
              हिन्दी
            </button>
          </div>
        </div>
      </div>

      {/* 2. Scrollable Body containing actions and filters */}
      <nav className="flex-1 p-4 overflow-y-auto space-y-4 pt-4 custom-scrollbar">
        
        {/* --- Card 1: SOS Panic Trigger --- */}
        <div id="section-sos" className={`p-4 rounded-2xl border transition-all duration-300 ${
          activeSOS 
            ? 'bg-emerald-50 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
            : 'bg-red-50/50 border-red-200 shadow-[0_0_20px_rgba(239,68,68,0.02)] hover:bg-red-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className={activeSOS ? "text-emerald-600" : "text-red-600"} size={18} />
              <span className={`text-xs font-bold uppercase tracking-wider ${activeSOS ? 'text-emerald-700' : 'text-red-700'}`}>
                {activeSOS ? selectT.sosBroadcasting : selectT.emergencySos}
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
            {activeSOS ? selectT.safeCancel : selectT.triggerSos}
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
            {selectT.reportTip}
          </button>
        </div>

        {/* --- Card 2: Live Location Sharing --- */}
        <div id="section-sharing" className={`p-4 rounded-2xl border transition-all duration-300 ${
          isSharingLocation 
            ? 'bg-cyan-50 border-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.1)]' 
            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Share2 className={isSharingLocation ? "text-cyan-600" : "text-slate-500"} size={18} />
              <span className={`text-xs font-bold uppercase tracking-wider ${isSharingLocation ? 'text-cyan-700' : 'text-slate-700'}`}>
                {isSharingLocation ? selectT.trackingActive : selectT.liveLocation}
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
              {isSharingLocation ? selectT.stopSharing : selectT.startSharing}
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
        <div id="section-route" className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">{selectT.routePlanner}</span>
          <div className="space-y-3">
            <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider block mb-1">{selectT.destination}</span>
            <div className="relative">
              <input
                type="text"
                value={routeQuery}
                onChange={(e) => {
                  setRouteQuery(e.target.value);
                  clearTimeout(routeDebounceRef.current);
                  routeDebounceRef.current = setTimeout(() => searchRouteDestination(e.target.value), 350);
                }}
                placeholder={selectT.destPlaceholder}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500/50"
              />
              {routeSearchLoading && (
                <div className="absolute right-3 top-2.5">
                  <span className="w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin block"></span>
                </div>
              )}

              {/* Autocomplete Dropdown */}
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
                  <span className="text-[0.65rem] text-slate-500 font-bold">{selectT.routeComparison}</span>
                  <button
                    onClick={() => {
                      setRouteDestination(null);
                      setRouteQuery('');
                      setRoutesData([]);
                    }}
                    className="text-[0.65rem] font-bold text-red-600 hover:text-red-500 transition-colors uppercase cursor-pointer border-none bg-transparent"
                  >
                    {selectT.clearRoute}
                  </button>
                </div>

                {routesData.length === 0 ? (
                  <div className="text-[0.7rem] text-slate-500 py-1 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></span>
                    {selectT.calculatingPaths}
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
                              {idx === 0 ? selectT.safestPath : `${selectT.alternative} ${idx}`}
                            </span>
                            <span className={`text-[0.65rem] font-extrabold px-1.5 py-0.5 rounded-full border ${safetyBg} ${safetyColor} ${safetyBorder}`}>
                              {safety}% {selectT.safeLevel}
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
        <div id="section-filters" className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">{selectT.incidentFilters}</span>
          
          <div>
            <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider block mb-2">{selectT.category}</span>
            <ul className="flex flex-col gap-1 list-none p-0">
              {CRIME_TYPES.map(({ value, label, labelHi, icon: Icon, accent }) => {
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
                      <span>{language === 'hi' ? labelHi : label}</span>
                      <span className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`} style={{ background: accent }} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="border-t border-slate-200 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">{selectT.dateFilter}</span>
              <div className="flex gap-1.5">
                <button
                  onClick={setTodayFilter}
                  className="text-[0.62rem] font-extrabold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
                >
                  {selectT.today}
                </button>
                {(localStartDate || localEndDate) && (
                  <button
                    onClick={clearDateFilter}
                    className="text-[0.62rem] font-extrabold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    {selectT.clear}
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[0.55rem] text-slate-500 font-bold uppercase tracking-wider block mb-1">{selectT.startDate}</span>
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
                <span className="text-[0.55rem] text-slate-500 font-bold uppercase tracking-wider block mb-1">{selectT.endDate}</span>
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
            <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider block mb-2">{selectT.dataSource}</span>
            <div className="flex bg-white p-1 rounded-xl gap-1 border border-slate-200">
              <button
                onClick={() => setFilters(f => ({ ...f, dataSource: 'both' }))}
                className={`flex-1 text-center py-1.5 px-1 rounded-lg text-[0.7rem] font-bold transition-all duration-200 cursor-pointer border-none
                  ${filters.dataSource === 'both' ? 'bg-slate-100 text-slate-800 shadow-sm border border-slate-200' : 'bg-transparent text-slate-500 hover:text-slate-700'}
                `}
              >
                {selectT.both}
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, dataSource: 'live' }))}
                className={`flex-1 text-center py-1.5 px-1 rounded-lg text-[0.7rem] font-bold transition-all duration-200 cursor-pointer border-none
                  ${filters.dataSource === 'live' ? 'bg-slate-100 text-slate-800 shadow-sm border border-slate-200' : 'bg-transparent text-slate-500 hover:text-slate-700'}
                `}
              >
                {selectT.liveTips}
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, dataSource: 'ncrb' }))}
                className={`flex-1 text-center py-1.5 px-1 rounded-lg text-[0.7rem] font-bold transition-all duration-200 cursor-pointer border-none
                  ${filters.dataSource === 'ncrb' ? 'bg-slate-100 text-slate-800 shadow-sm border border-slate-200' : 'bg-transparent text-slate-500 hover:text-slate-700'}
                `}
              >
                {selectT.ncrb}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider block mb-2">{selectT.timeOfDay}</span>
            <div className="flex bg-white p-1 rounded-xl gap-1 border border-slate-200">
              {['all', 'day', 'night'].map((time) => (
                <button
                  key={time}
                  onClick={() => setFilters(f => ({ ...f, timeOfDay: time }))}
                  className={`flex-1 text-center py-1.5 px-1 rounded-lg text-[0.7rem] font-bold transition-all duration-200 cursor-pointer border-none
                    ${filters.timeOfDay === time ? 'bg-slate-100 text-slate-800 shadow-sm border border-slate-200' : 'bg-transparent text-slate-500 hover:text-slate-700'}
                  `}
                >
                  {time === 'all' ? selectT.hours24 : time === 'day' ? selectT.day : selectT.night}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider block mb-2">{selectT.safeInfra}</span>
            <label className="flex items-center gap-2 px-1 py-1 cursor-pointer hover:text-slate-800 text-slate-700 transition-colors">
              <input 
                type="checkbox"
                checked={filters.showSafeSpots || false}
                onChange={(e) => setFilters(f => ({ ...f, showSafeSpots: e.target.checked, safeSpotsSearchTrigger: (f.safeSpotsSearchTrigger || 0) + 1 }))}
                className="rounded border-slate-350 bg-white text-emerald-650 focus:ring-emerald-500/50"
              />
              <span className="text-xs font-bold text-emerald-600">{selectT.showNearby}</span>
            </label>

            {filters.showSafeSpots && (
              <div className="mt-3 flex flex-col gap-3">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">{selectT.searchRadius}</span>
                    <span className="text-[0.7rem] font-extrabold text-emerald-600">
                      {localRadius >= 1000 
                        ? `${(localRadius / 1000).toFixed(1)} km` 
                        : `${localRadius}m`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="2500"
                    step="500"
                    value={localRadius}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setLocalRadius(val);
                      clearTimeout(radiusDebounceRef.current);
                      radiusDebounceRef.current = setTimeout(() => {
                        setFilters(f => ({ 
                          ...f, 
                          safeSpotsRadius: val,
                          safeSpotsSearchTrigger: (f.safeSpotsSearchTrigger || 0) + 1 
                        }));
                      }, 500);
                    }}
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
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[0.65rem] font-extrabold text-slate-500 uppercase tracking-wider">{selectT.nearestSafe}</span>
                    <button 
                      onClick={() => setFilters(f => ({ ...f, safeSpotsSearchTrigger: (f.safeSpotsSearchTrigger || 0) + 1 }))}
                      className="text-[0.6rem] font-bold text-emerald-650 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded cursor-pointer transition-colors"
                    >
                      {selectT.searchThisArea}
                    </button>
                  </div>
                  
                  {loadingSafeSpots ? (
                    <div className="flex flex-col gap-2 py-1">
                      <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-[0.6rem] uppercase tracking-wider animate-pulse mb-1">
                        <Loader2 className="animate-spin text-emerald-500" size={12} />
                        <span>{selectT.searchingSpots}</span>
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
                      {selectT.enableGpsPrompt}
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
                            police: '🚨',
                            hospital: '🏥',
                            pharmacy: '💊',
                            metro: '🚇',
                            fuel: '⛽',
                            ev_charging: '⚡'
                          };

                          const getSpotTypeLabel = (type) => {
                            switch(type) {
                              case 'police': return language === 'hi' ? 'पुलिस स्टेशन/चौकी' : 'Police Station/Chowki';
                              case 'hospital': return language === 'hi' ? 'अस्पताल/क्लिनिक' : 'Hospital/Clinic';
                              case 'pharmacy': return language === 'hi' ? 'दवा की दुकान' : 'Chemist Shop';
                              case 'metro': return language === 'hi' ? 'मेट्रो स्टेशन' : 'Metro Station';
                              case 'fuel': return language === 'hi' ? 'पेट्रोल/सीएनजी पंप' : 'Petrol/CNG Pump';
                              case 'ev_charging': return language === 'hi' ? 'ईवी चार्जिंग स्टेशन' : 'EV Charging Station';
                              default: return language === 'hi' ? 'सुरक्षित स्थान' : 'Safe Spot';
                            }
                          }

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
                                    {getSpotTypeLabel(spot.type)}
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
                      {selectT.noPlaces}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

      </nav>
      
      <div className="p-4 border-t border-slate-200 bg-slate-50 md:hidden">
        <button 
          onClick={toggleSidebar}
          className="w-full font-bold text-xs py-2 text-center bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer shadow-sm"
        >
          {selectT.closePanel}
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

      {/* Collapsible Sidebar (w-80 or w-[72px]) - Responsive Absolute Overlay on Mobile and Relative Sidebar on Desktop */}
      <motion.div 
        animate={{ width: isOpen ? 320 : 72 }}
        transition={{ type: "spring", bounce: 0.1, duration: 0.35 }}
        className="flex flex-col md:relative absolute inset-y-0 left-0 h-full bg-white border-r border-slate-200 shadow-md shrink-0 pointer-events-auto select-none z-[1002]"
      >
        {isOpen ? (
          <div className="flex flex-col h-full w-[320px] overflow-hidden">
            {renderSidebarContent()}
            
            {/* Collapse Pull-tab on the right edge */}
            <button
              onClick={() => setIsOpen(false)}
              title={language === 'hi' ? "पैनल सिकोड़ें" : "Collapse Panel"}
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-16 bg-white border border-slate-200 border-l-0 rounded-r-xl shadow-md flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-slate-50 hover:w-4 hover:-right-4 transition-all duration-200 group z-[1001]"
            >
              <div className="w-[2px] h-[3px] rounded-full bg-slate-400" />
              <div className="w-[2px] h-[3px] rounded-full bg-slate-400" />
              <div className="w-[2px] h-[3px] rounded-full bg-slate-400" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full w-[72px] items-center py-4 justify-between overflow-hidden bg-slate-50 relative">
            {/* Top Logo */}
            <div className="flex flex-col items-center gap-4">
              <div 
                onClick={() => setIsOpen(true)}
                className="w-10 h-10 rounded-full overflow-hidden shadow-md bg-slate-900 flex items-center justify-center border border-slate-200 cursor-pointer hover:scale-105 transition-transform"
                title={language === 'hi' ? "पैनल फैलाएं" : "Expand Panel"}
              >
                <Globe3DDemo />
              </div>
            </div>

            {/* Vertical list of navigation icons */}
            <div className="flex flex-col gap-4 my-auto">
              {/* SOS Icon */}
              <button
                onClick={() => {
                  setIsOpen(true);
                  setTimeout(() => document.getElementById('section-sos')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                title={language === 'hi' ? "एसओएस आपातकाल" : "Emergency SOS"}
                className={`w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-all border shadow-sm ${
                  activeSOS 
                    ? 'bg-red-650 hover:bg-red-600 text-white border-red-500 animate-pulse' 
                    : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                }`}
              >
                <ShieldAlert size={20} />
              </button>

              {/* Location Sharing Icon */}
              <button
                onClick={() => {
                  setIsOpen(true);
                  setTimeout(() => document.getElementById('section-sharing')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                title={language === 'hi' ? "लोकेशन शेयरिंग" : "Live Location Sharing"}
                className={`w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-all border shadow-sm ${
                  isSharingLocation
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <Share2 size={20} />
              </button>

              {/* Route Planner Icon */}
              <button
                onClick={() => {
                  setIsOpen(true);
                  setTimeout(() => document.getElementById('section-route')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                title={language === 'hi' ? "मार्ग योजनाकार" : "Safe Route Planner"}
                className={`w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-all border shadow-sm ${
                  routeDestination
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                    : 'bg-white hover:bg-slate-50 text-slate-655 border-slate-200'
                }`}
              >
                <MapPin size={20} />
              </button>

              {/* Filters Icon */}
              <button
                onClick={() => {
                  setIsOpen(true);
                  setTimeout(() => document.getElementById('section-filters')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                title={language === 'hi' ? "घटना फिल्टर" : "Incident Filters"}
                className="w-11 h-11 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center cursor-pointer transition-all shadow-sm"
              >
                <Search size={20} />
              </button>
            </div>
            
            {/* User Avatar Circle */}
            <div className="flex flex-col items-center">
              {currentUser ? (
                <div 
                  onClick={() => setIsOpen(true)}
                  className="w-10 h-10 rounded-full bg-cyan-100 border border-cyan-200 flex items-center justify-center text-cyan-700 font-extrabold text-sm uppercase cursor-pointer hover:scale-105 transition-transform"
                  title={`${currentUser.name} (${currentUser.username})`}
                >
                  {currentUser.name ? currentUser.name[0] : currentUser.username[0]}
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-950 flex items-center justify-center text-white cursor-pointer transition-all shadow-sm"
                  title="Sign In"
                >
                  <User size={18} />
                </button>
              )}
            </div>

            {/* Expand Pull-tab on the right edge */}
            <button
              onClick={() => setIsOpen(true)}
              title={language === 'hi' ? "पैनल फैलाएं" : "Expand Panel"}
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-16 bg-white border border-slate-200 border-l-0 rounded-r-xl shadow-md flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-slate-50 hover:w-4 hover:-right-4 transition-all duration-200 group z-[1001]"
            >
              <div className="w-[2px] h-[3px] rounded-full bg-slate-400" />
              <div className="w-[2px] h-[3px] rounded-full bg-slate-400" />
              <div className="w-[2px] h-[3px] rounded-full bg-slate-400" />
            </button>
          </div>
        )}
      </motion.div>

    </div>
  );
}