import { Share2, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react'

export default function SosButton({ 
  userLocation, 
  locationStatus, 
  locationError,
  activeSOS,
  showModal,
  setShowModal,
  countdown,
  cancelCountdown,
  startCountdown,
  resolveSOS
}) {

  const handleButtonClick = () => {
    if (activeSOS) {
      resolveSOS()
    } else {
      if (locationStatus === 'denied') {
        alert("🚨 Location Access Denied: Jagriti requires location access to trigger an SOS alert. Please allow location permissions in your browser/system settings.")
      } else if (locationStatus === 'error' && locationError) {
        alert(`🚨 Location Error: ${locationError}. Please check your device's location/GPS settings.`)
      } else if (locationStatus === 'loading' || !userLocation) {
        alert("🛰️ Acquiring GPS coordinates... Please ensure location services are enabled on your device and wait a moment.")
      } else {
        setShowModal(true)
      }
    }
  }

  const shareLocation = async () => {
    if (!userLocation) return
    let userId = localStorage.getItem('jagriti_user_id')
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substring(2, 15)
      localStorage.setItem('jagriti_user_id', userId)
    }
    const shareUrl = `${window.location.origin}/?sosId=${userId}&lat=${userLocation.lat}&lng=${userLocation.lng}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: '🚨 JAGRITI EMERGENCY SOS 🚨',
          text: `Please monitor my live location security alert immediately.`,
          url: shareUrl,
        })
      } catch (err) {
        console.log('Share canceled:', err)
      }
    } else {
      // Fallback: Copy link to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl)
        alert('Tracking link copied to clipboard! Share it via your messaging apps.')
      } catch (err) {
        console.error('Failed to copy tracking link:', err)
      }
    }
  }

  return (
    <>
      {/* Floating SOS button */}
      <button
        onClick={handleButtonClick}
        className={`
          absolute bottom-[160px] right-4 md:bottom-[180px] md:right-24 z-[1000]
          w-14 h-14 rounded-full flex flex-col items-center justify-center
          text-white font-bold text-xs shadow-lg transition-all duration-300
          active:scale-95 cursor-pointer
          ${activeSOS 
            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.6)] animate-pulse' 
            : 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.6)] hover:scale-105'
          }
        `}
        title={activeSOS ? "I am Safe - Stop SOS" : "Trigger Emergency SOS"}
      >
        {activeSOS ? (
          <>
            <CheckCircle size={20} className="mb-0.5" />
            <span>SAFE</span>
          </>
        ) : (
          <>
            <ShieldAlert size={20} className="mb-0.5 animate-pulse" />
            <span>SOS</span>
          </>
        )}
      </button>

      {/* Trigger Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl">
            {countdown !== null ? (
              <div className="flex flex-col items-center py-6">
                <div className="text-7xl font-black text-red-500 animate-ping mb-4">
                  {countdown}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">SENDING SOS BEACON</h3>
                <p className="text-xs text-slate-500 mb-6 font-semibold">
                  Broadcasting your live location and sounding siren in {countdown} seconds...
                </p>
                <button
                  onClick={cancelCountdown}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-6 py-2.5 rounded-xl transition-all cursor-pointer text-sm border-none"
                >
                  Cancel Alert
                </button>
              </div>
            ) : (
              <div>
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                    <AlertTriangle size={24} />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Trigger Emergency SOS</h3>
                <p className="text-xs text-slate-500 mb-6 font-semibold">
                  Select incident type to notify nearby citizens immediately.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    onClick={() => startCountdown('harassment')}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all flex flex-col items-center gap-1.5 cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    Harassment
                  </button>
                  <button
                    onClick={() => startCountdown('assault')}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all flex flex-col items-center gap-1.5 cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                    Assault / Violence
                  </button>
                  <button
                    onClick={() => startCountdown('suspicious')}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all flex flex-col items-center gap-1.5 cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    Suspicious Activity
                  </button>
                  <button
                    onClick={() => startCountdown('other')}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all flex flex-col items-center gap-1.5 cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    Other Threat
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-sm border-none"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share button banner during active SOS */}
      {activeSOS && userLocation && (
        <div className="absolute top-24 right-4 md:right-32 z-[1000] flex flex-col gap-2">
          <button
            onClick={shareLocation}
            className="
              flex items-center gap-2 bg-white border border-slate-200
              text-slate-700 font-bold text-xs px-4 py-3 rounded-xl
              shadow-[0_8px_32px_rgba(0,0,0,0.1)]
              hover:text-slate-900 hover:bg-slate-50 hover:scale-105
              transition-all duration-300 cursor-pointer
            "
          >
            <Share2 size={16} className="text-cyan-600 animate-pulse" />
            <span>Share Live Tracking Link</span>
          </button>
        </div>
      )}
    </>
  )
}
