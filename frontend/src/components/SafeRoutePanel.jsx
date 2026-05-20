import { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Navigation, Car, Bike, Truck, Eye, ArrowLeft, Loader2, Globe, Sparkles 
} from 'lucide-react';

const TRANSLATIONS = {
  en: {
    planRoute: "Plan Safe Route",
    from: "From (Start Location)",
    to: "To (Destination)",
    fromPlaceholder: "Enter starting point...",
    toPlaceholder: "Enter destination...",
    currentLocation: "Use Current Location",
    findSafeRoute: "Find Safe Route",
    searching: "Searching...",
    noRoutes: "No routes found.",
    errorFetching: "Failed to calculate route.",
    car: "Car",
    bike: "Bike",
    truck: "Truck",
    walk: "Walk",
    languageLabel: "हिन्दी",
    gpsLocked: "GPS Location Active",
    calculatingText: "Analyzing route safety and details...",
    validationError: "Please select both starting point and destination."
  },
  hi: {
    planRoute: "सुरक्षित मार्ग योजना",
    from: "यहाँ से (प्रारंभिक स्थान)",
    to: "यहाँ तक (गंतव्य स्थान)",
    fromPlaceholder: "प्रारंभिक बिंदु दर्ज करें...",
    toPlaceholder: "गंतव्य बिंदु दर्ज करें...",
    currentLocation: "वर्तमान स्थान का उपयोग करें",
    findSafeRoute: "सुरक्षित मार्ग खोजें",
    searching: "खोज की जा रही है...",
    noRoutes: "कोई मार्ग नहीं मिला।",
    errorFetching: "मार्ग की गणना करने में विफल।",
    car: "कार",
    bike: "बाइक",
    truck: "ट्रक",
    walk: "पैदल",
    languageLabel: "English",
    gpsLocked: "जीपीएस सक्रिय है",
    calculatingText: "मार्ग की सुरक्षा और विवरणों का विश्लेषण किया जा रहा है...",
    validationError: "कृपया प्रारंभिक और गंतव्य दोनों बिंदु चुनें।"
  }
};

export default function SafeRoutePanel({
  userLocation,
  locationStatus,
  fromLocation,
  setFromLocation,
  routeDestination,
  setRouteDestination,
  routesData,
  setRoutesData,
  selectedRouteIndex,
  setSelectedRouteIndex,
  transportMode,
  setTransportMode,
  language,
  setLanguage,
  onClose,
  showNotification
}) {
  const t = TRANSLATIONS[language];

  // Search input values
  const [fromQuery, setFromQuery] = useState(fromLocation ? fromLocation.label : '');
  const [toQuery, setToQuery] = useState(routeDestination ? routeDestination.label : '');

  // Autocomplete suggestions
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [fromLoading, setFromLoading] = useState(false);
  const [toLoading, setToLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const fromDebounce = useRef(null);
  const toDebounce = useRef(null);

  // Sync inputs with state
  useEffect(() => {
    if (fromLocation) setFromQuery(fromLocation.label);
  }, [fromLocation]);

  useEffect(() => {
    if (routeDestination) setToQuery(routeDestination.label);
  }, [routeDestination]);

  // Autocomplete searches biased to India
  const searchNominatim = async (query, setResults, setLoading) => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=in&limit=5&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': language } });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error('Nominatim autocomplete error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFromChange = (val) => {
    setFromQuery(val);
    clearTimeout(fromDebounce.current);
    fromDebounce.current = setTimeout(() => {
      searchNominatim(val, setFromSuggestions, setFromLoading);
    }, 400);
  };

  const handleToChange = (val) => {
    setToQuery(val);
    clearTimeout(toDebounce.current);
    toDebounce.current = setTimeout(() => {
      searchNominatim(val, setToSuggestions, setToLoading);
    }, 400);
  };

  const useGPSForFrom = () => {
    if (locationStatus === 'granted' && userLocation) {
      setFromLocation({
        lat: userLocation.lat,
        lng: userLocation.lng,
        label: language === 'en' ? "Current GPS Location" : "वर्तमान जीपीएस स्थान"
      });
      setFromQuery(language === 'en' ? "Current GPS Location" : "वर्तमान जीपीएस स्थान");
      showNotification(language === 'en' ? "Set start to current location" : "प्रारंभिक बिंदु वर्तमान स्थान पर सेट किया गया");
    } else {
      showNotification(language === 'en' ? "Acquiring GPS location... Please verify permission." : "जीपीएस स्थान प्राप्त किया जा रहा है...");
    }
  };

  // Helper for Haversine Distance in meters
  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Execute safe route calculation pipeline
  const calculateSafeRoute = async () => {
    if (!fromLocation || !routeDestination) {
      showNotification(t.validationError);
      return;
    }

    setCalculating(true);
    setRoutesData([]);

    try {
      // 1. Fetch routes from OSRM
      const profile = transportMode === 'walk' ? 'foot' : 'driving';
      const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${fromLocation.lng},${fromLocation.lat};${routeDestination.lng},${routeDestination.lat}?overview=full&geometries=geojson&steps=true&annotations=true&alternatives=true`;
      
      const osrmRes = await fetch(osrmUrl);
      const osrmData = await osrmRes.json();

      if (osrmData.code !== 'Ok' || !osrmData.routes || osrmData.routes.length === 0) {
        showNotification(t.noRoutes);
        setCalculating(false);
        return;
      }

      // 2. Process and Evaluate safety scores & Overpass queries for each route
      const evaluatedRoutes = await Promise.all(osrmData.routes.map(async (route, index) => {
        // Calculate Bounding Box of the route
        let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
        route.geometry.coordinates.forEach(coord => {
          const [lng, lat] = coord;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
        });

        // Add padding to bounding box (~2km)
        const pad = 0.02;
        const bbox = `${minLat - pad},${minLng - pad},${maxLat + pad},${maxLng + pad}`;

        // Parallel evaluations: safety-check, toll booths (Overpass), facilities (Overpass)
        const safetyPromise = fetch('/api/routes/safety-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ routeGeometry: route.geometry, transportMode })
        }).then(r => r.json());

        // Overpass queries
        const overpassTollUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node["barrier"="toll_booth"](${bbox});out body;`;
        const overpassFacilityUrl = `https://overpass-api.de/api/interpreter?data=[out:json];(node["amenity"="fuel"](${bbox});node["amenity"="charging_station"](${bbox});node["amenity"="hospital"](${bbox});node["amenity"="restaurant"]["cuisine"="indian"](${bbox}););out body;`;

        const tollPromise = fetch(overpassTollUrl).then(r => r.json()).catch(() => ({ elements: [] }));
        const facilityPromise = fetch(overpassFacilityUrl).then(r => r.json()).catch(() => ({ elements: [] }));

        const [safetyResult, tollResult, facilityResult] = await Promise.all([
          safetyPromise,
          tollPromise,
          facilityPromise
        ]);

        // Filter Overpass toll booths within 200m of route
        const tollBooths = (tollResult.elements || []).filter(node => {
          return route.geometry.coordinates.some(coord => {
            const [lng, lat] = coord;
            return haversineDistance(lat, lng, node.lat, node.lon) <= 200;
          });
        });

        // Filter Overpass facilities within 1km of route
        const facilities = (facilityResult.elements || []).filter(node => {
          return route.geometry.coordinates.some(coord => {
            const [lng, lat] = coord;
            return haversineDistance(lat, lng, node.lat, node.lon) <= 1000;
          });
        });

        // Query backend for NHAI toll cost estimates
        let tollInfo = { min: 0, max: 0, formatted: '₹0' };
        if (tollBooths.length > 0) {
          const tollEstRes = await fetch(`/api/routes/toll-estimate?mode=${transportMode}&count=${tollBooths.length}`);
          tollInfo = await tollEstRes.json();
        }

        return {
          ...route,
          safetyScore: safetyResult.safetyScore || 100,
          hotspotCount: safetyResult.hotspotCount || 0,
          hotspotSegments: safetyResult.hotspotSegments || [],
          dangerousAreas: safetyResult.dangerousAreas || [],
          tollBooths,
          tollInfo,
          facilities
        };
      }));

      // Sort: Safest path first
      evaluatedRoutes.sort((a, b) => b.safetyScore - a.safetyScore);

      setRoutesData(evaluatedRoutes);
      setSelectedRouteIndex(0);
      showNotification(language === 'en' ? "Routes calculated successfully" : "मार्ग की सफलतापूर्वक गणना की गई");
    } catch (err) {
      console.error(err);
      showNotification(t.errorFetching);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden pointer-events-auto shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-lg transition-colors border-none bg-transparent cursor-pointer text-slate-650"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="font-extrabold text-[0.8rem] uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Sparkles size={14} className="text-cyan-600 animate-pulse" />
              {t.planRoute}
            </span>
          </div>
        </div>

        {/* Hindi Toggle */}
        <button
          onClick={() => setLanguage(lang => lang === 'en' ? 'hi' : 'en')}
          className="flex items-center gap-1 text-[0.65rem] font-bold text-cyan-600 hover:text-cyan-500 bg-cyan-50 hover:bg-cyan-100 px-2.5 py-1 rounded-full border border-cyan-100 transition-all cursor-pointer uppercase tracking-wider"
        >
          <Globe size={11} />
          <span>{t.languageLabel}</span>
        </button>
      </div>

      {/* Input panel & Autocomplete */}
      <div className="p-4 space-y-4 border-b border-slate-100">
        
        {/* From Field */}
        <div>
          <label className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">{t.from}</label>
          <div className="relative">
            <input
              type="text"
              value={fromQuery}
              onChange={(e) => handleFromChange(e.target.value)}
              placeholder={t.fromPlaceholder}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 placeholder-slate-450 focus:outline-none focus:border-cyan-500/50"
            />
            {fromLoading && (
              <div className="absolute right-3 top-3">
                <Loader2 size={14} className="text-cyan-600 animate-spin" />
              </div>
            )}

            {/* From Dropdown */}
            {fromSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 z-50 bg-white border border-slate-250 rounded-xl overflow-hidden divide-y divide-slate-100 mt-1 max-h-[160px] overflow-y-auto shadow-lg">
                {fromSuggestions.map((r, i) => (
                  <button
                    key={r.place_id ?? i}
                    onClick={() => {
                      setFromLocation({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), label: r.display_name.split(',')[0] });
                      setFromQuery(r.display_name.split(',')[0]);
                      setFromSuggestions([]);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 text-[0.7rem] text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer border-none bg-transparent"
                  >
                    <MapPin size={12} className="text-cyan-600 shrink-0" />
                    <span className="truncate font-semibold text-[0.68rem]">{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* GPS Quick Button */}
          {userLocation && (
            <button
              onClick={useGPSForFrom}
              className="mt-1.5 text-[0.65rem] font-semibold text-cyan-600 hover:underline flex items-center gap-1 border-none bg-transparent cursor-pointer"
            >
              <Navigation size={10} />
              <span>{t.currentLocation}</span>
            </button>
          )}
        </div>

        {/* To Field */}
        <div>
          <label className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">{t.to}</label>
          <div className="relative">
            <input
              type="text"
              value={toQuery}
              onChange={(e) => handleToChange(e.target.value)}
              placeholder={t.toPlaceholder}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 placeholder-slate-450 focus:outline-none focus:border-cyan-500/50"
            />
            {toLoading && (
              <div className="absolute right-3 top-3">
                <Loader2 size={14} className="text-cyan-600 animate-spin" />
              </div>
            )}

            {/* To Dropdown */}
            {toSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 z-50 bg-white border border-slate-250 rounded-xl overflow-hidden divide-y divide-slate-100 mt-1 max-h-[160px] overflow-y-auto shadow-lg">
                {toSuggestions.map((r, i) => (
                  <button
                    key={r.place_id ?? i}
                    onClick={() => {
                      setRouteDestination({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), label: r.display_name.split(',')[0] });
                      setToQuery(r.display_name.split(',')[0]);
                      setToSuggestions([]);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 text-[0.7rem] text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer border-none bg-transparent"
                  >
                    <MapPin size={12} className="text-cyan-600 shrink-0" />
                    <span className="truncate font-semibold text-[0.68rem]">{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Transport Mode Selector */}
        <div>
          <label className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider block mb-2">{t.car} | {t.bike} | {t.truck} | {t.walk}</label>
          <div className="grid grid-cols-4 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
            {[
              { id: 'car', icon: Car, label: t.car },
              { id: 'bike', icon: Bike, label: t.bike },
              { id: 'truck', icon: Truck, label: t.truck },
              { id: 'walk', icon: Eye, label: t.walk } // standard walking replacement icon or custom
            ].map(mode => {
              const Icon = mode.icon;
              const isSelected = transportMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setTransportMode(mode.id)}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-cyan-500 text-cyan-600 shadow-sm'
                      : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon size={16} />
                  <span className="text-[0.6rem] font-extrabold mt-1 uppercase tracking-wider">{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={calculateSafeRoute}
          disabled={calculating || !fromLocation || !routeDestination}
          className="w-full py-3 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md"
        >
          {calculating ? (
            <>
              <Loader2 size={14} className="animate-spin text-white" />
              <span>{t.searching}</span>
            </>
          ) : (
            <span>{t.findSafeRoute}</span>
          )}
        </button>
      </div>

      {/* Calculating indicator */}
      {calculating && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-3 bg-slate-50/50">
          <Loader2 size={32} className="text-cyan-600 animate-spin" />
          <span className="text-xs font-bold text-slate-500 text-center animate-pulse uppercase tracking-wider">
            {t.calculatingText}
          </span>
        </div>
      )}

      {/* Children elements (e.g. RouteSummaryCard, RouteDirections) will render under parent */}
      {!calculating && routesData.length > 0 && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {/* Card Summary & Directions render parent */}
        </div>
      )}
    </div>
  );
}
