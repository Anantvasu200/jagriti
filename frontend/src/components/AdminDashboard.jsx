import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  Clock, 
  Database, 
  TrendingUp, 
  Search, 
  Filter, 
  ArrowLeft, 
  LogOut, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  ShieldAlert, 
  Mail, 
  Phone,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { API_BASE_URL } from '../utils/apiConfig';

export default function AdminDashboard({ currentUser, navigateTo, showNotification, onSignOut }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters for User Directory
  const [userGenderFilter, setUserGenderFilter] = useState('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Filters for Incident Ledger
  const [incidentSourceFilter, setIncidentSourceFilter] = useState('all');
  const [incidentSearchQuery, setIncidentSearchQuery] = useState('');

  // Fetch Admin Metrics on Mount
  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('jagriti_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const resData = await response.json();
      
      if (resData.status === 'success') {
        setMetrics(resData.data);
      } else {
        setError(resData.message || 'Failed to fetch admin metrics.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to backend failed. Please verify that the server is online.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center z-[5000]">
        <div className="w-12 h-12 border-4 border-slate-350 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Loading Administrator Console...</h2>
        <p className="text-xs text-slate-500 mt-1">Aggregating national database stats, SCRAP logs and user records.</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center p-6 z-[5000]">
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4 border border-rose-100">
          <ShieldAlert size={28} className="text-rose-600 animate-bounce" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Administrative Initialization Failed</h2>
        <p className="text-sm text-slate-500 text-center max-w-md mt-2 mb-6">
          {error || "An unknown authentication or database synchronization error occurred."}
        </p>
        <div className="flex gap-4">
          <button 
            onClick={fetchMetrics}
            className="px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-all shadow-md"
          >
            Retry Connection
          </button>
          <button 
            onClick={() => navigateTo('/')}
            className="px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-350 cursor-pointer transition-all"
          >
            Return to Safety Map
          </button>
        </div>
      </div>
    );
  }

  // Filtered Users List
  const filteredUsers = metrics.users.list.filter(user => {
    const matchesGender = userGenderFilter === 'all' || user.gender.toLowerCase() === userGenderFilter.toLowerCase();
    const query = userSearchQuery.toLowerCase();
    const matchesSearch = 
      user.name.toLowerCase().includes(query) ||
      user.surname.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.mobileNumber.includes(query);
    return matchesGender && matchesSearch;
  });

  // Filtered Incidents List
  const filteredIncidents = metrics.incidents.list.filter(inc => {
    const matchesSource = incidentSourceFilter === 'all' || inc.source === incidentSourceFilter;
    const query = incidentSearchQuery.toLowerCase();
    const matchesSearch = 
      inc.title.toLowerCase().includes(query) ||
      (inc.description && inc.description.toLowerCase().includes(query)) ||
      (inc.city && inc.city.toLowerCase().includes(query)) ||
      inc.type.toLowerCase().includes(query);
    return matchesSource && matchesSearch;
  });

  // Calculate SVG Pie/Donut Chart Angles
  const renderSourceDonut = () => {
    const ncrb = metrics.incidents.ncrb;
    const nlp = metrics.incidents.nlp;
    const comm = metrics.incidents.community;
    const total = ncrb + nlp + comm || 1;

    const ncrbPct = Math.round((ncrb / total) * 100);
    const nlpPct = Math.round((nlp / total) * 100);
    const commPct = Math.round((comm / total) * 100);

    // SVG parameters
    const size = 180;
    const radius = 70;
    const center = size / 2;
    const strokeWidth = 22;
    const circumference = 2 * Math.PI * radius;

    // Stroke offsets
    const ncrbOffset = circumference - (ncrb / total) * circumference;
    const nlpOffset = circumference - (nlp / total) * circumference;
    const commOffset = circumference - (comm / total) * circumference;

    return (
      <div className="flex flex-col md:flex-row items-center gap-8 justify-center p-4">
        <div className="relative w-[180px] h-[180px]">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background ring */}
            <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
            
            {/* NCRB Arc */}
            <circle 
              cx={center} cy={center} r={radius} fill="transparent" 
              stroke="#6366f1" strokeWidth={strokeWidth} 
              strokeDasharray={circumference} strokeDashoffset={ncrbOffset}
              className="transition-all duration-500 ease-out"
            />
            
            {/* NLP Arc (offsetted) */}
            <circle 
              cx={center} cy={center} r={radius} fill="transparent" 
              stroke="#0ea5e9" strokeWidth={strokeWidth} 
              strokeDasharray={circumference} 
              strokeDashoffset={nlpOffset}
              style={{ transform: `rotate(${(ncrb / total) * 360}deg)`, transformOrigin: 'center' }}
              className="transition-all duration-500 ease-out"
            />

            {/* Community Arc (offsetted) */}
            <circle 
              cx={center} cy={center} r={radius} fill="transparent" 
              stroke="#10b981" strokeWidth={strokeWidth} 
              strokeDasharray={circumference} 
              strokeDashoffset={commOffset}
              style={{ transform: `rotate(${((ncrb + nlp) / total) * 360}deg)`, transformOrigin: 'center' }}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="text-2xl font-black text-slate-800">{total}</span>
            <span className="text-[0.65rem] text-slate-400 font-extrabold uppercase mt-1">Safety Records</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-md bg-indigo-600 shrink-0" />
            <div>
              <div className="text-xs font-black text-slate-800">NCRB Database Records</div>
              <div className="text-[0.65rem] text-slate-500">{ncrb} items ({ncrbPct}%)</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-md bg-sky-500 shrink-0" />
            <div>
              <div className="text-xs font-black text-slate-800">NLP Scrap Feeds</div>
              <div className="text-[0.65rem] text-slate-500">{nlp} items ({nlpPct}%)</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-md bg-emerald-500 shrink-0" />
            <div>
              <div className="text-xs font-black text-slate-800">Community Reported Alerts</div>
              <div className="text-[0.65rem] text-slate-500">{comm} items ({commPct}%)</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render SVG Line Chart comparing Scrape times vs Newspaper Publication Dates
  const renderTrendChart = () => {
    const scrapes = metrics.trends.scrapes;
    const pubs = metrics.trends.publications;

    if (scrapes.length === 0 && pubs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <TrendingUp className="text-slate-350 mb-2" size={24} />
          <span className="text-xs text-slate-500">Not enough safety alerts recorded to plot trend.</span>
        </div>
      );
    }

    // Determine coordinate grids
    const width = 640;
    const height = 220;
    const padding = 30;

    const allDataPoints = [...scrapes.map(d => d.count), ...pubs.map(d => d.count)];
    const maxVal = Math.max(...allDataPoints, 10);
    const dateCount = Math.max(scrapes.length, pubs.length, 1);

    // Map function
    const getX = (index) => padding + (index / (dateCount - 1 || 1)) * (width - 2 * padding);
    const getY = (val) => height - padding - (val / maxVal) * (height - 2 * padding);

    // SVG paths
    let scrapePath = "";
    let pubPath = "";

    scrapes.forEach((d, idx) => {
      const x = getX(idx);
      const y = getY(d.count);
      scrapePath += `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    });

    pubs.forEach((d, idx) => {
      const x = getX(idx);
      const y = getY(d.count);
      pubPath += `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    });

    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 border-t-2 border-sky-500 shrink-0" />
              <span className="text-[0.65rem] font-extrabold uppercase text-slate-500">Live Scraped Ingest (Scrap Time)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 border-t-2 border-indigo-600 shrink-0" />
              <span className="text-[0.65rem] font-extrabold uppercase text-slate-500">Source Publication (Newspaper Time)</span>
            </div>
          </div>
          <span className="text-[0.65rem] font-extrabold text-slate-400 uppercase tracking-widest">Last 30 Active Days</span>
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[550px] bg-slate-950/5 border border-slate-350/30 rounded-2xl p-2">
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = getY(maxVal * ratio);
              return (
                <g key={idx}>
                  <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth={1} />
                  <text x={padding - 5} y={y + 4} textAnchor="end" className="text-[9px] font-bold fill-slate-400">{Math.round(maxVal * ratio)}</text>
                </g>
              );
            })}

            {/* Paths */}
            {scrapePath && (
              <path d={scrapePath} fill="none" stroke="#0ea5e9" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            )}
            {pubPath && (
              <path d={pubPath} fill="none" stroke="#4f46e5" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            )}

            {/* Dots */}
            {scrapes.map((d, idx) => (
              <circle key={`scr-${idx}`} cx={getX(idx)} cy={getY(d.count)} r={3.5} className="fill-white stroke-sky-500 stroke-2 cursor-pointer hover:r-5 transition-all" />
            ))}
            {pubs.map((d, idx) => (
              <circle key={`pub-${idx}`} cx={getX(idx)} cy={getY(d.count)} r={3.5} className="fill-white stroke-indigo-600 stroke-2 cursor-pointer hover:r-5 transition-all" />
            ))}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col z-[4000] overflow-hidden font-sans">
      
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <header className="h-[70px] bg-white border-b border-slate-350/40 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigateTo('/')}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-350/30 transition-all cursor-pointer"
            title="Return to Safety Map"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md uppercase tracking-wider">Admin</span>
              <h1 className="text-lg font-black text-slate-800 leading-none">Jagriti Security Console</h1>
            </div>
            <p className="text-[0.65rem] text-slate-500 uppercase tracking-widest font-extrabold mt-1">System Health, Scrap Analysis & User Directory</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-extrabold text-slate-800">{currentUser?.name} {currentUser?.surname}</span>
            <span className="text-[0.65rem] text-slate-400 font-bold">{currentUser?.email}</span>
          </div>
          <button 
            onClick={() => {
              if (window.confirm("Are you sure you want to sign out from the Jagriti Safety console?")) {
                localStorage.removeItem('jagriti_token');
                localStorage.removeItem('jagriti_user');
                onSignOut();
                navigateTo('/');
                showNotification("Logged out from console.");
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl bg-slate-900 hover:bg-slate-800 text-white cursor-pointer transition-all shadow-md"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── MAIN GRID ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar Nav */}
        <nav className="w-[240px] bg-white border-r border-slate-350/35 flex flex-col gap-1 p-4 shrink-0 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all border-none text-left cursor-pointer ${
              activeTab === 'overview' 
                ? 'bg-indigo-50 text-indigo-700' 
                : 'bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Database size={16} />
            <span>Portal Overview</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all border-none text-left cursor-pointer ${
              activeTab === 'users' 
                ? 'bg-indigo-50 text-indigo-700' 
                : 'bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Users size={16} />
            <span>User Directory</span>
          </button>

          <button 
            onClick={() => setActiveTab('incidents')}
            className={`flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all border-none text-left cursor-pointer ${
              activeTab === 'incidents' 
                ? 'bg-indigo-50 text-indigo-700' 
                : 'bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <MapPin size={16} />
            <span>Incident Ledger</span>
          </button>

          <button 
            onClick={() => setActiveTab('trends')}
            className={`flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all border-none text-left cursor-pointer ${
              activeTab === 'trends' 
                ? 'bg-indigo-50 text-indigo-700' 
                : 'bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <TrendingUp size={16} />
            <span>Trends & Charts</span>
          </button>
          
          <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[0.65rem] text-slate-400 font-extrabold uppercase">
              <span>Database Connection</span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Active
              </span>
            </div>
            <div className="text-[0.62rem] text-slate-450 leading-relaxed font-bold bg-slate-50 p-2.5 rounded-xl border border-slate-350/20">
              System seeded default administrator account for test environments: <span className="font-mono text-indigo-600">admin@jagriti.org</span>
            </div>
          </div>
        </nav>

        {/* Tab View Container */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/60">
          
          {/* ──────────────────────────────────────────────────────── */}
          {/* OVERVIEW TAB */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-8 max-w-6xl">
              
              {/* Widgets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* User Count Widget */}
                <div className="bg-white border border-slate-350/30 p-6 rounded-2xl shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300">
                  <div>
                    <span className="text-[0.65rem] text-slate-400 font-extrabold uppercase tracking-widest block">Total Registered Users</span>
                    <span className="text-3xl font-black text-slate-800 mt-1 block">{metrics.users.total}</span>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[0.62rem] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black uppercase">M: {metrics.users.male}</span>
                      <span className="text-[0.62rem] bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded font-black uppercase">F: {metrics.users.female}</span>
                      <span className="text-[0.62rem] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-black uppercase">O: {metrics.users.other}</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 text-indigo-600">
                    <Users size={22} />
                  </div>
                </div>

                {/* Safety Incident Widget */}
                <div className="bg-white border border-slate-350/30 p-6 rounded-2xl shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300">
                  <div>
                    <span className="text-[0.65rem] text-slate-400 font-extrabold uppercase tracking-widest block">Total Safety Alerts</span>
                    <span className="text-3xl font-black text-slate-800 mt-1 block">{metrics.incidents.total}</span>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[0.62rem] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-black uppercase">Scrapes: {metrics.incidents.nlp}</span>
                      <span className="text-[0.62rem] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-black uppercase">Reports: {metrics.incidents.community}</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100 text-sky-600">
                    <MapPin size={22} />
                  </div>
                </div>

                {/* Scraped Today Widget */}
                <div className="bg-white border border-slate-350/30 p-6 rounded-2xl shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300">
                  <div>
                    <span className="text-[0.65rem] text-slate-400 font-extrabold uppercase tracking-widest block">Ingested Today</span>
                    <span className="text-3xl font-black text-slate-800 mt-1 block">{metrics.incidents.todayScraped}</span>
                    <div className="flex items-center gap-1 mt-2 text-[0.62rem] text-emerald-600 font-black uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span>Live NLP Scrapes Active</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 text-emerald-600">
                    <Clock size={22} />
                  </div>
                </div>

                {/* NCRB Database record Widget */}
                <div className="bg-white border border-slate-350/30 p-6 rounded-2xl shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300">
                  <div>
                    <span className="text-[0.65rem] text-slate-400 font-extrabold uppercase tracking-widest block">NCRB Archive Entries</span>
                    <span className="text-3xl font-black text-slate-800 mt-1 block">{metrics.incidents.ncrb}</span>
                    <span className="text-[0.62rem] text-indigo-500 font-extrabold mt-2 block uppercase">Official Crime Data</span>
                  </div>
                  <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center border border-violet-100 text-violet-600">
                    <Database size={22} />
                  </div>
                </div>

              </div>

              {/* Grid 2: Donut + Latest activity Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* Source breakdown chart card */}
                <div className="lg:col-span-3 bg-white border border-slate-350/30 rounded-2xl shadow-sm p-6 flex flex-col">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-2">Safety Record Source Mix</h3>
                  <p className="text-[0.65rem] text-slate-450 mb-6 font-bold leading-normal">Percentage distribution of compiled safety items from official government statistics (NCRB), local newspapers parsed by NLP, and validated community reports.</p>
                  
                  <div className="flex-1 flex items-center justify-center">
                    {renderSourceDonut()}
                  </div>
                </div>

                {/* Live Activity Feed */}
                <div className="lg:col-span-2 bg-white border border-slate-350/30 rounded-2xl shadow-sm p-6 flex flex-col max-h-[380px] overflow-hidden">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4">Latest Ingest Feed</h3>
                  <div className="flex-1 overflow-y-auto flex flex-col gap-4">
                    {metrics.incidents.list.slice(0, 10).map((inc, i) => (
                      <div key={inc.id ?? i} className="flex gap-3 items-start border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black uppercase ${
                          inc.source === 'ncrb' ? 'bg-indigo-50 text-indigo-700' :
                          inc.source === 'community' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'
                        }`}>
                          {inc.source === 'ncrb' ? 'NCRB' : inc.source === 'community' ? 'COMM' : 'NLP'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-extrabold text-slate-800 truncate leading-snug">{inc.title}</div>
                          <div className="flex items-center gap-2 mt-1 text-[0.62rem] text-slate-400 font-bold">
                            <span className="capitalize">{inc.type}</span>
                            <span>•</span>
                            <span>{inc.city || 'Unknown Location'}</span>
                            <span>•</span>
                            <span>Scraped {new Date(inc.createdAt).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* USER DIRECTORY TAB */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'users' && (
            <div className="flex flex-col gap-6 max-w-6xl">
              
              {/* Header and filters card */}
              <div className="bg-white border border-slate-350/30 rounded-2xl shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Registered User Database</h3>
                    <p className="text-[0.65rem] text-slate-450 mt-1 font-bold">Search and filter individuals verified through dual OTP multi-factor SMS/email gates.</p>
                  </div>
                  
                  {/* Filter panel */}
                  <div className="flex flex-wrap items-center gap-3">
                    
                    {/* Search box */}
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <input 
                        type="text"
                        placeholder="Search name, phone..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 text-xs border border-slate-350/50 rounded-xl bg-slate-50 focus:bg-white focus:outline-indigo-600 transition-all font-bold placeholder:text-slate-400 w-[200px]"
                      />
                    </div>

                    {/* Gender select buttons */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      {['all', 'male', 'female', 'other'].map(gender => (
                        <button
                          key={gender}
                          onClick={() => setUserGenderFilter(gender)}
                          className={`px-3 py-1.5 text-[0.62rem] font-extrabold uppercase rounded-lg border-none cursor-pointer transition-all ${
                            userGenderFilter === gender
                              ? 'bg-white text-indigo-700 shadow-sm'
                              : 'bg-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {gender}
                        </button>
                      ))}
                    </div>

                  </div>
                </div>

                {/* User Count Stats */}
                <div className="mt-4 text-[0.65rem] text-slate-400 font-extrabold uppercase flex items-center gap-2">
                  <span>Filtered Result:</span>
                  <span className="text-slate-700">{filteredUsers.length} Users found</span>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-350/30 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-100 text-[0.65rem] text-slate-400 font-extrabold uppercase tracking-wider">
                        <th className="px-6 py-4">User Info</th>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4">Gender</th>
                        <th className="px-6 py-4">Verification ID</th>
                        <th className="px-6 py-4">Join Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-bold">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                          <tr key={user.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="px-6 py-4">
                              <div>
                                <span className="font-extrabold text-slate-800 block">{user.name} {user.surname}</span>
                                <span className="text-[0.65rem] text-slate-450 font-bold font-mono">@{user.username}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-slate-700">
                                  <Mail size={12} className="text-slate-400 shrink-0" />
                                  <span>{user.email}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-700">
                                  <Phone size={12} className="text-slate-400 shrink-0" />
                                  <span>{user.mobileNumber}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 text-[0.62rem] font-extrabold rounded-md uppercase ${
                                user.gender.toLowerCase() === 'male' ? 'bg-indigo-50 text-indigo-700' :
                                user.gender.toLowerCase() === 'female' ? 'bg-pink-50 text-pink-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {user.gender}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-[0.62rem] text-slate-450 select-all">
                              {user.id}
                            </td>
                            <td className="px-6 py-4 text-slate-400">
                              {new Date(user.createdAt).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'})}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-slate-400 text-xs font-semibold">
                            No users registered matching current filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* INCIDENT LEDGER TAB */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'incidents' && (
            <div className="flex flex-col gap-6 max-w-6xl">
              
              {/* Filter Card */}
              <div className="bg-white border border-slate-350/30 rounded-2xl shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Incident Registry Ledger</h3>
                    <p className="text-[0.65rem] text-slate-450 mt-1 font-bold">Log details outlining Scrap ingestion timestamps, source newspaper dates, and community verification ratios.</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    
                    {/* Search box */}
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <input 
                        type="text"
                        placeholder="Search title, city..."
                        value={incidentSearchQuery}
                        onChange={(e) => setIncidentSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 text-xs border border-slate-350/50 rounded-xl bg-slate-50 focus:bg-white focus:outline-indigo-600 transition-all font-bold placeholder:text-slate-400 w-[200px]"
                      />
                    </div>

                    {/* Source filter buttons */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      {['all', 'ncrb', 'nlp', 'community'].map(source => (
                        <button
                          key={source}
                          onClick={() => setIncidentSourceFilter(source)}
                          className={`px-3 py-1.5 text-[0.62rem] font-extrabold uppercase rounded-lg border-none cursor-pointer transition-all ${
                            incidentSourceFilter === source
                              ? 'bg-white text-indigo-700 shadow-sm'
                              : 'bg-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {source === 'nlp' ? 'News Scrape' : source === 'community' ? 'Community' : source}
                        </button>
                      ))}
                    </div>

                  </div>
                </div>

                <div className="mt-4 text-[0.65rem] text-slate-400 font-extrabold uppercase flex items-center gap-2">
                  <span>Filtered Result:</span>
                  <span className="text-slate-700">{filteredIncidents.length} Records found</span>
                </div>
              </div>

              {/* Table Ledger */}
              <div className="bg-white border border-slate-350/30 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-100 text-[0.65rem] text-slate-400 font-extrabold uppercase tracking-wider">
                        <th className="px-6 py-4">Safety Title & Category</th>
                        <th className="px-6 py-4">Source Type</th>
                        <th className="px-6 py-4">Newspaper Publish Date</th>
                        <th className="px-6 py-4">System Ingest Date</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-bold">
                      {filteredIncidents.length > 0 ? (
                        filteredIncidents.slice(0, 150).map((inc, i) => (
                          <tr key={inc.id ?? i} className="hover:bg-slate-50/50 transition-all">
                            <td className="px-6 py-4">
                              <div>
                                <span className="font-extrabold text-slate-800 block max-w-sm truncate leading-snug">{inc.title}</span>
                                <div className="flex items-center gap-2 mt-1 text-[0.65rem]">
                                  <span className={`px-1.5 py-0.2 rounded font-black uppercase text-[0.58rem] ${
                                    inc.type === 'assault' ? 'bg-red-50 text-red-650 border border-red-100' :
                                    inc.type === 'harassment' ? 'bg-pink-50 text-pink-750 border border-pink-100' :
                                    inc.type === 'theft' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-50 text-slate-550 border border-slate-200'
                                  }`}>
                                    {inc.type}
                                  </span>
                                  <span className="text-slate-400 font-extrabold uppercase">{inc.city || 'Unknown Location'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className={`text-[0.62rem] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md inline-block w-fit ${
                                  inc.source === 'ncrb' ? 'bg-indigo-50 text-indigo-700' :
                                  inc.source === 'community' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'
                                }`}>
                                  {inc.source === 'ncrb' ? 'NCRB Archive' : inc.source === 'community' ? 'Community Report' : 'News Scraper'}
                                </span>
                                {inc.sources && inc.sources.length > 0 && (
                                  <a 
                                    href={inc.sources[0].sourceUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-[0.65rem] text-indigo-600 hover:underline mt-1 font-semibold flex items-center gap-1 w-fit"
                                  >
                                    <span>Source URL</span>
                                    <ArrowRight size={10} />
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <Clock size={12} className="text-slate-400" />
                                <span>{new Date(inc.date).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'})}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-mono text-[0.62rem]">
                              {new Date(inc.createdAt).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`flex items-center gap-1 text-[0.65rem] font-extrabold uppercase ${
                                inc.isVerified ? 'text-emerald-600' : 'text-amber-600'
                              }`}>
                                {inc.isVerified ? (
                                  <>
                                    <CheckCircle size={12} />
                                    <span>Verified</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle size={12} />
                                    <span>Pending</span>
                                  </>
                                )}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-slate-400 text-xs font-semibold">
                            No incidents found matching criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredIncidents.length > 150 && (
                  <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 text-center text-[0.65rem] font-bold text-slate-400 uppercase">
                    Displaying first 150 records. Refine search terms to view specific historical items.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* TRENDS TAB */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'trends' && (
            <div className="flex flex-col gap-8 max-w-4xl">
              
              {/* Scrap vs Publish Trend card */}
              <div className="bg-white border border-slate-350/30 rounded-2xl shadow-sm p-6">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-1">Time Dimension Scrapes vs Publications</h3>
                <p className="text-[0.65rem] text-slate-450 mb-6 font-bold">Dual comparative daily charting of system scrape ingest timeline versus the original publication timestamps of safety hazards.</p>
                {renderTrendChart()}
              </div>

              {/* Grid: Type bar chart + Source summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Horizontal Bar Chart for Type breakdown */}
                <div className="bg-white border border-slate-350/30 rounded-2xl shadow-sm p-6 flex flex-col">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4">Category Frequency Breakdown</h3>
                  <div className="flex-1 flex flex-col gap-4">
                    {Object.keys(metrics.incidents.typeBreakdown).map(type => {
                      const count = metrics.incidents.typeBreakdown[type];
                      const total = metrics.incidents.total || 1;
                      const pct = Math.round((count / total) * 100);
                      
                      return (
                        <div key={type} className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-xs font-extrabold">
                            <span className="capitalize text-slate-700">{type}</span>
                            <span className="text-slate-500 font-bold">{count} items ({pct}%)</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                type === 'assault' ? 'bg-red-500' :
                                type === 'harassment' ? 'bg-pink-500' :
                                type === 'theft' ? 'bg-amber-500' : 'bg-slate-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* General Analysis Insights */}
                <div className="bg-white border border-slate-350/30 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4">Console Diagnostic Logs</h3>
                    <div className="flex flex-col gap-3.5 text-xs text-slate-650 leading-relaxed font-bold">
                      <div className="flex gap-2">
                        <CheckCircle className="text-emerald-500 shrink-0" size={16} />
                        <span>Database synchronized with PostGIS coordinates and spatial triggers.</span>
                      </div>
                      <div className="flex gap-2">
                        <CheckCircle className="text-emerald-500 shrink-0" size={16} />
                        <span>Dual OTP verification nodes verified for registration.</span>
                      </div>
                      <div className="flex gap-2">
                        <CheckCircle className="text-emerald-500 shrink-0" size={16} />
                        <span>Automatic NLP background RSS parser status active.</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 mt-6 flex justify-between items-center">
                    <span className="text-[0.65rem] text-slate-400 font-extrabold uppercase">Console Version</span>
                    <span className="text-[0.65rem] text-indigo-600 font-extrabold uppercase font-mono">v1.2.0-secure</span>
                  </div>
                </div>

              </div>

            </div>
          )}

        </main>

      </div>

    </div>
  );
}
