import { useTranslation } from 'react-i18next';
import { 
  ShieldAlert, ShieldCheck, MapPin, Compass, Wallet, Fuel, Zap, HeartPulse, Coffee, ArrowRight 
} from 'lucide-react';

const TRANSLATIONS = {
  en: {
    safetyScore: "Safety Score",
    totalDistance: "Total Distance",
    estimatedTime: "Estimated Time",
    hotspotsNearRoute: "Hotspots Near Route",
    tollBooths: "Toll Booths",
    tollCost: "Est. Toll Cost",
    facilityOverlay: "Nearby Facilities (within 1km)",
    fuel: "Petrol Pumps",
    charging: "EV Charging",
    hospital: "Hospitals",
    restaurant: "Rest Stops / Dhabas",
    unsafeWarning: "Unsafe Route Warning",
    unsafeDesc: "This route has a low safety score. We recommend using a safer alternative.",
    saferAlternativeAvailable: "Safer alternative route available",
    showSaferRoute: "Switch to Safer Route",
    routeSelector: "Select Path"
  },
  hi: {
    safetyScore: "सुरक्षा स्कोर",
    totalDistance: "कुल दूरी",
    estimatedTime: "अनुमानित समय",
    hotspotsNearRoute: "मार्ग के पास हॉटस्पॉट",
    tollBooths: "टोल बूथ",
    tollCost: "अनुमानित टोल शुल्क",
    facilityOverlay: "आस-पास की सुविधाएं (1 किमी के भीतर)",
    fuel: "पेट्रोल पंप",
    charging: "ईवी चार्जिंग",
    hospital: "अस्पताल",
    restaurant: "ढाबा / विश्राम गृह",
    unsafeWarning: "असुरक्षित मार्ग चेतावनी",
    unsafeDesc: "इस मार्ग का सुरक्षा स्कोर कम है। हम एक सुरक्षित विकल्प का उपयोग करने की सलाह देते हैं।",
    saferAlternativeAvailable: "सुरक्षित वैकल्पिक मार्ग उपलब्ध है",
    showSaferRoute: "सुरक्षित मार्ग पर जाएं",
    routeSelector: "मार्ग का चयन करें"
  }
};

export default function RouteSummaryCard({
  route,
  routesCount,
  activeIndex,
  setActiveIndex,
  activeFacilities,
  setActiveFacilities,
  language,
  showNotification
}) {
  if (!route) return null;

  const { t: i18nT } = useTranslation();
  const t = new Proxy({}, {
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

  const safety = route.safetyScore;
  const hotspots = route.hotspotCount;
  const tollCount = route.tollBooths ? route.tollBooths.length : 0;
  const tollPrice = route.tollInfo ? route.tollInfo.formatted : '₹0';

  // Format distance
  const distanceKm = (route.distance / 1000).toFixed(1);
  // Format duration
  const durationMins = Math.round(route.duration / 60);

  // Safety styling configuration
  let safetyColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  let safetyBarColor = 'bg-emerald-500';
  let SafetyIcon = ShieldCheck;

  if (safety < 30) {
    safetyColor = 'text-red-700 bg-red-50 border-red-200';
    safetyBarColor = 'bg-red-500';
    SafetyIcon = ShieldAlert;
  } else if (safety < 50) {
    safetyColor = 'text-orange-700 bg-orange-50 border-orange-200';
    safetyBarColor = 'bg-orange-500';
    SafetyIcon = ShieldAlert;
  } else if (safety < 80) {
    safetyColor = 'text-amber-700 bg-amber-50 border-amber-200';
    safetyBarColor = 'bg-amber-500';
    SafetyIcon = ShieldAlert;
  }

  // Find if there is a safer alternative route in routesData
  const hasSaferAlternative = safety < 50 && activeIndex !== 0;

  const handleFacilityToggle = (key) => {
    setActiveFacilities(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      const status = updated[key] ? "Enabled" : "Disabled";
      const name = key === 'fuel' ? t.fuel : key === 'charging' ? t.charging : key === 'hospital' ? t.hospital : t.restaurant;
      showNotification(`${name} ${status}`);
      return updated;
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
      
      {/* Route Header Info */}
      <div className="flex items-center justify-between">
        <span className="text-[0.62rem] font-bold text-slate-450 uppercase tracking-widest leading-none">
          {t.routeSelector} ({activeIndex + 1}/{routesCount})
        </span>
        <span className={`text-[0.68rem] font-extrabold px-2.5 py-1 rounded-full border flex items-center gap-1 uppercase tracking-wider ${safetyColor}`}>
          <SafetyIcon size={12} />
          {safety}% {t.safetyScore}
        </span>
      </div>

      {/* Primary Metrics Row */}
      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <div>
          <span className="block text-[0.6rem] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{t.totalDistance}</span>
          <span className="text-sm font-extrabold text-slate-800 leading-none">{distanceKm} km</span>
        </div>
        <div>
          <span className="block text-[0.6rem] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{t.estimatedTime}</span>
          <span className="text-sm font-extrabold text-slate-800 leading-none">{durationMins} mins</span>
        </div>
      </div>

      {/* Safety Score Meter (Progress Bar) */}
      <div className="space-y-1">
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-500 ${safetyBarColor}`} style={{ width: `${safety}%` }} />
        </div>
      </div>

      {/* Secondary Metrics: Hotspots & Tolls */}
      <div className="grid grid-cols-2 gap-3 text-slate-700">
        <div className="flex items-center gap-2">
          <ShieldAlert size={14} className={hotspots > 0 ? "text-red-500" : "text-slate-400"} />
          <div className="leading-tight">
            <span className="block text-[0.58rem] font-semibold text-slate-500 uppercase tracking-wider">{t.hotspotsNearRoute}</span>
            <span className="text-xs font-bold text-slate-800">{hotspots}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Wallet size={14} className={tollCount > 0 ? "text-cyan-600" : "text-slate-400"} />
          <div className="leading-tight">
            <span className="block text-[0.58rem] font-semibold text-slate-500 uppercase tracking-wider">{t.tollBooths}</span>
            <span className="text-xs font-bold text-slate-800">{tollCount} ({tollPrice})</span>
          </div>
        </div>
      </div>

      {/* Unsafe Alert / Suggest Alternative Route */}
      {safety < 50 && (
        <div className="p-3 bg-red-50/50 border border-red-200 rounded-xl space-y-2">
          <div className="flex gap-2 items-start">
            <ShieldAlert size={16} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="block text-[0.68rem] font-bold text-red-800 uppercase tracking-wider">{t.unsafeWarning}</span>
              <span className="block text-[0.62rem] text-red-650 leading-normal font-medium">{t.unsafeDesc}</span>
            </div>
          </div>
          {hasSaferAlternative && (
            <button
              onClick={() => setActiveIndex(0)} // Safest path is always sorted at index 0
              className="w-full py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[0.65rem] font-extrabold uppercase tracking-wider transition-colors cursor-pointer border-none flex items-center justify-center gap-1"
            >
              <span>{t.showSaferRoute}</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}

      {/* Facilities Overlay Panel */}
      <div className="border-t border-slate-100 pt-3">
        <span className="text-[0.62rem] font-extrabold text-slate-550 uppercase tracking-wider block mb-2">{t.facilityOverlay}</span>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'fuel', label: t.fuel, icon: Fuel, color: 'text-amber-600 bg-amber-50 border-amber-200' },
            { key: 'charging', label: t.charging, icon: Zap, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
            { key: 'hospital', label: t.hospital, icon: HeartPulse, color: 'text-red-600 bg-red-50 border-red-200' },
            { key: 'restaurant', label: t.restaurant, icon: Coffee, color: 'text-orange-600 bg-orange-50 border-orange-200' }
          ].map(fac => {
            const Icon = fac.icon;
            const isActive = activeFacilities[fac.key];
            return (
              <button
                key={fac.key}
                onClick={() => handleFacilityToggle(fac.key)}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer text-left border-slate-200 bg-transparent ${
                  isActive ? fac.color : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon size={14} className="shrink-0" />
                <span className="text-[0.62rem] font-bold uppercase tracking-wider truncate">{fac.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
