'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Siren, Phone, MapPin, Radio, Shield, Clock,
  CheckCircle, Loader2, AlertTriangle, Wifi, WifiOff,
  X, Navigation, User, Star, ChevronDown, MessageSquare, ExternalLink
} from 'lucide-react'
import {
  getLocation, startLocationBroadcast, acquireWakeLock, releaseWakeLock,
  queueSOSAlert, getQueuedAlerts, clearQueuedAlerts, sendSOSBeacon,
  loadLocalSettings, type LocationData, type SOSSettings
} from '@/lib/sos'

type SOSState = 'idle' | 'holding' | 'activating' | 'active' | 'confirming_safe' | 'practice'
type NetworkState = 'online' | 'queued' | 'sent'

type OfficerInfo = {
  name: string
  badge: string
  rank: string
  eta: number | null
  latitude: number | null
  longitude: number | null
  lastSeen: string | null
}

export default function SOSFloatingButton() {
  const supabase = createClient()

  // Core state
  const [state, setState] = useState<SOSState>('idle')
  const [sosId, setSosId] = useState<string | null>(null)
  const [isPractice, setIsPractice] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [location, setLocation] = useState<LocationData | null>(null)
  const [networkState, setNetworkState] = useState<NetworkState>('online')
  const [officer, setOfficer] = useState<OfficerInfo | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [safeCountdown, setSafeCountdown] = useState(5)
  const [userId, setUserId] = useState<string | null>(null)
  const [settings, setSettings] = useState<SOSSettings>(loadLocalSettings())
  const [smsSentCount, setSmsSentCount] = useState(0)
  const [smsError, setSmsError] = useState<string | null>(null)

  // Refs
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const holdStartRef = useRef<number>(0)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const locationCleanupRef = useRef<(() => void) | null>(null)
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // Check for existing active SOS on mount
  useEffect(() => {
    if (!userId) return
    const checkActive = async () => {
      try {
        const res = await fetch('/api/sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_active', userId }),
        })
        const data = await res.json()
        if (data.sos) {
          setSosId(data.sos.id)
          setState('active')
          setLocation({
            latitude: data.sos.latitude,
            longitude: data.sos.longitude,
            accuracy: data.sos.location_accuracy,
            source: data.sos.location_source || 'gps',
            timestamp: Date.now(),
          })
          startActiveMode(data.sos.id)
        }
      } catch {}
    }
    checkActive()
  }, [userId])

  // Retry queued alerts when online
  useEffect(() => {
    const handleOnline = async () => {
      const queued = await getQueuedAlerts()
      for (const alert of queued) {
        try {
          await fetch('/api/sos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alert),
          })
        } catch {}
      }
      await clearQueuedAlerts()
      setNetworkState('sent')
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  /* ═══════════════════════════════════════════════
     HOLD-TO-ACTIVATE
     ═══════════════════════════════════════════════ */
  const startHold = useCallback((practice = false) => {
    setIsPractice(practice)
    setState('holding')
    holdStartRef.current = Date.now()
    setHoldProgress(0)

    const duration = settings.holdDuration * 1000

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current
      const progress = Math.min(elapsed / duration, 1)
      setHoldProgress(progress)

      if (progress >= 1) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current)
        activateSOS(practice)
      }
    }, 16) // ~60fps
  }, [settings.holdDuration])

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current)
    setHoldProgress(0)
    if (state === 'holding') setState('idle')
  }, [state])

  /* ═══════════════════════════════════════════════
     SEND WHATSAPP / SMS WITH GOOGLE MAPS LINK
     ═══════════════════════════════════════════════ */
  const sendWhatsAppAlerts = (loc: LocationData, contacts: string[], userName?: string) => {
    if (!contacts || contacts.length === 0) return 0

    const mapsLink = loc.latitude !== 0 && loc.longitude !== 0
      ? `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`
      : 'Location unavailable'

    const accuracyStr = loc.accuracy ? ` (±${Math.round(loc.accuracy)}m)` : ''
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

    const message = `🚨 *SOS EMERGENCY ALERT* 🚨

${userName ? `*${userName}* has` : 'Someone has'} activated an emergency SOS alert!

📍 *Live Location:*
${mapsLink}${accuracyStr}

🕐 *Time:* ${dateStr}, ${timeStr}
📡 *Source:* ${loc.source === 'gps' ? 'GPS (High accuracy)' : loc.source === 'network' ? 'Network' : 'Approximate'}

⚠️ Please check on them immediately or call 112 (National Emergency).

_Sent automatically by COPS Safety Platform_`

    const encodedMessage = encodeURIComponent(message)
    let sentCount = 0

    // Open WhatsApp for each contact
    for (const contact of contacts) {
      // Format phone: ensure it has country code
      const phoneDigits = contact.replace(/\D/g, '')
      const fullPhone = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodedMessage}`

      // Open in new tab/window
      try {
        window.open(whatsappUrl, `_whatsapp_${sentCount}`)
        sentCount++
      } catch {
        // Fallback: try sms: protocol
        try {
          const smsMessage = `SOS EMERGENCY! ${userName || 'Someone'} needs help! Location: ${mapsLink} — Time: ${timeStr}`
          window.open(`sms:${contact}?body=${encodeURIComponent(smsMessage)}`, '_blank')
          sentCount++
        } catch {}
      }
    }

    return sentCount
  }

  /* ═══════════════════════════════════════════════
     ACTIVATE SOS
     ═══════════════════════════════════════════════ */
  const activateSOS = async (practice: boolean) => {
    setState('activating')
    setSmsSentCount(0)
    setSmsError(null)

    // Get location (never blocks)
    const loc = await getLocation()
    setLocation(loc)

    // Get user name for the WhatsApp message
    let userName = ''
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        if (profile) userName = profile.full_name
      }
    } catch {}

    if (practice) {
      // Practice mode — save to DB too for history tracking
      try {
        const res = await fetch('/api/sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'activate',
            userId,
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            locationSource: loc.source,
            isPractice: true,
            emergencyContacts: settings.emergencyContacts,
            deviceInfo: {
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
              online: navigator.onLine,
            },
          }),
        })
        if (!res.ok) throw new Error('API Error')
        const data = await res.json()
        setSosId(data.id || 'practice-' + Date.now())
      } catch {
        setSosId('practice-' + Date.now())
      }

      setState('practice')
      startPracticeMode()
      return
    }

    // Acquire wake lock
    acquireWakeLock()

    const payload = {
      action: 'activate',
      userId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      locationSource: loc.source,
      locationDescription: loc.source === 'manual' ? 'GPS unavailable' : undefined,
      isPractice: false,
      emergencyContacts: settings.emergencyContacts,
      deviceInfo: {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        online: navigator.onLine,
      },
    }

    try {
      // Try sendBeacon first (survives page close)
      const beaconSent = sendSOSBeacon('/api/sos', payload)

      // Also try fetch for response data
      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('API Error')

      const data = await res.json()
      setSosId(data.id)
      setNetworkState('sent')
      setState('active')
      startActiveMode(data.id)

      // Send WhatsApp alerts to emergency contacts
      if (settings.smsAlert && settings.emergencyContacts.length > 0) {
        const count = sendWhatsAppAlerts(loc, settings.emergencyContacts, userName)
        setSmsSentCount(count)

        // Initiate phone call to the first emergency contact
        const firstContact = settings.emergencyContacts[0]
        const phoneDigits = firstContact.replace(/\D/g, '')
        const fullPhone = phoneDigits.length === 10 ? `+91${phoneDigits}` : phoneDigits
        
        setTimeout(() => {
          window.location.href = `tel:${fullPhone}`
        }, 500)

        // Record in DB that SMS was sent
        if (data.id) {
          try {
            await fetch('/api/sos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'mark_sms_sent',
                sosId: data.id,
                sentTo: settings.emergencyContacts,
              }),
            })
          } catch {}
        }
      }
    } catch {
      // Offline — queue it
      await queueSOSAlert(payload)
      setNetworkState('queued')
      setSosId('queued-' + Date.now())
      setState('active')
      startActiveMode(null)

      // Still try WhatsApp (works offline on mobile if app is installed)
      if (settings.smsAlert && settings.emergencyContacts.length > 0) {
        const count = sendWhatsAppAlerts(loc, settings.emergencyContacts, userName)
        setSmsSentCount(count)

        // Initiate phone call to the first emergency contact
        const firstContact = settings.emergencyContacts[0]
        const phoneDigits = firstContact.replace(/\D/g, '')
        const fullPhone = phoneDigits.length === 10 ? `+91${phoneDigits}` : phoneDigits
        
        setTimeout(() => {
          window.location.href = `tel:${fullPhone}`
        }, 500)
      }

      // Start retry
      let retryDelay = 3000
      retryRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/sos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (!res.ok) throw new Error('API Error')
          const data = await res.json()
          setSosId(data.id)
          setNetworkState('sent')
          await clearQueuedAlerts()
          if (retryRef.current) clearInterval(retryRef.current)
        } catch {
          retryDelay = Math.min(retryDelay * 1.5, 30000)
        }
      }, retryDelay)
    }
  }

  /* ═══════════════════════════════════════════════
     ACTIVE MODE — location broadcast, elapsed timer, realtime
     ═══════════════════════════════════════════════ */
  const startActiveMode = (id: string | null) => {
    // Elapsed timer
    const start = Date.now()
    elapsedTimerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - start) / 1000))
    }, 1000)

    // Location broadcast every 10s
    locationCleanupRef.current = startLocationBroadcast(async (loc) => {
      setLocation(loc)
      if (id) {
        try {
          await fetch('/api/sos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_location',
              sosId: id,
              latitude: loc.latitude,
              longitude: loc.longitude,
              accuracy: loc.accuracy,
              locationSource: loc.source,
            }),
          })
        } catch {}
      }
    }, 10000)

    // Subscribe to SOS event updates (officer response)
    if (id) {
      supabase
        .channel(`sos-${id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sos_events', filter: `id=eq.${id}` }, (payload: any) => {
          const updated = payload.new
          if (updated.responded_by && updated.status === 'responded') {
            // Fetch officer info
            fetchOfficerInfo(updated.responded_by, updated.responding_officer_eta)
          }
          if (updated.responding_officer_location) {
            setOfficer(prev => prev ? {
              ...prev,
              latitude: updated.responding_officer_location?.latitude,
              longitude: updated.responding_officer_location?.longitude,
              lastSeen: new Date().toISOString(),
              eta: updated.responding_officer_eta,
            } : null)
          }
        })
        .subscribe()
    }
  }

  const fetchOfficerInfo = async (officerId: string, eta: number | null) => {
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', officerId).single()
    const { data: op } = await supabase.from('officer_profiles').select('badge_number, rank').eq('id', officerId).single()

    if (profile && op) {
      setOfficer({
        name: profile.full_name,
        badge: op.badge_number,
        rank: op.rank,
        eta,
        latitude: null,
        longitude: null,
        lastSeen: null,
      })
    }
  }

  /* ═══════════════════════════════════════════════
     PRACTICE MODE
     ═══════════════════════════════════════════════ */
  const startPracticeMode = () => {
    const start = Date.now()
    elapsedTimerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - start) / 1000))
    }, 1000)

    // Simulate officer response after 5s
    setTimeout(() => {
      setOfficer({
        name: 'SI Rajesh Kumar (Demo)',
        badge: 'IND-2024-0042',
        rank: 'sub_inspector',
        eta: 480,
        latitude: null,
        longitude: null,
        lastSeen: new Date().toISOString(),
      })
    }, 5000)

    // Simulate ETA countdown
    let simulatedEta = 480
    const etaTimer = setInterval(() => {
      simulatedEta -= 10
      setOfficer(prev => prev ? { ...prev, eta: Math.max(0, simulatedEta) } : null)
      if (simulatedEta <= 0) clearInterval(etaTimer)
    }, 1000)
  }

  /* ═══════════════════════════════════════════════
     DEACTIVATION — Two-step "I Am Safe"
     ═══════════════════════════════════════════════ */
  const startSafeConfirmation = () => {
    setState('confirming_safe')
    setSafeCountdown(5)

    countdownRef.current = setInterval(() => {
      setSafeCountdown(prev => {
        if (prev <= 1) {
          // Auto-cancel confirmation — back to active
          if (countdownRef.current) clearInterval(countdownRef.current)
          setState(isPractice ? 'practice' : 'active')
          return 5
        }
        return prev - 1
      })
    }, 1000)
  }

  const confirmSafe = async () => {
    if (countdownRef.current) clearInterval(countdownRef.current)

    const resolveId = sosId && !sosId.startsWith('queued-') && !sosId.startsWith('practice-') ? sosId : null

    if (resolveId) {
      try {
        await fetch('/api/sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'resolve', sosId: resolveId, userId }),
        })
      } catch {}
    }

    cleanupActive()
    setState('idle')
  }

  const cancelSafeConfirmation = () => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setState(isPractice ? 'practice' : 'active')
  }

  /* ═══════════════════════════════════════════════
     CLEANUP
     ═══════════════════════════════════════════════ */
  const cleanupActive = () => {
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
    if (locationCleanupRef.current) locationCleanupRef.current()
    if (retryRef.current) clearInterval(retryRef.current)
    releaseWakeLock()
    setSosId(null)
    setOfficer(null)
    setElapsedTime(0)
    setLocation(null)
    setIsPractice(false)
    setNetworkState('online')
    setHoldProgress(0)
    setSmsSentCount(0)
    setSmsError(null)
  }

  useEffect(() => {
    return () => cleanupActive()
  }, [])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const formatETA = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m} min ${s}s` : `${s}s`
  }

  /* ═══════════════════════════════════════════════
     RENDER — Idle: Floating button
     ═══════════════════════════════════════════════ */
  if (state === 'idle') {
    return (
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2">
        {/* Practice mode link */}
        <button
          onClick={() => startHold(true)}
          onMouseDown={() => startHold(true)}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={() => startHold(true)}
          onTouchEnd={cancelHold}
          className="bg-gray-800/90 backdrop-blur text-gray-400 text-[10px] px-3 py-1.5 rounded-lg hover:text-white transition-colors border border-gray-700"
        >
          Practice SOS
        </button>

        {/* Main SOS button */}
        <button
          onMouseDown={() => startHold(false)}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={(e) => { e.preventDefault(); startHold(false) }}
          onTouchEnd={cancelHold}
          className="relative w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-700 shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_rgba(239,68,68,0.6)] transition-all active:scale-95 group"
          title="Hold for 2 seconds to activate SOS"
        >
          <Siren className="w-7 h-7 text-white mx-auto" />
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-gray-500 whitespace-nowrap">
            Hold to SOS
          </span>
        </button>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════
     RENDER — Holding: Progress ring
     ═══════════════════════════════════════════════ */
  if (state === 'holding') {
    const deg = holdProgress * 360
    return (
      <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center"
        onMouseUp={cancelHold} onTouchEnd={cancelHold}>
        <div className="text-center">
          <div className="relative w-40 h-40 mx-auto mb-6">
            {/* Progress ring using conic-gradient */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(#ef4444 ${deg}deg, #1f1f1f ${deg}deg)`,
                padding: '6px',
              }}
            >
              <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center">
                <Siren className="w-16 h-16 text-red-500" />
              </div>
            </div>
          </div>
          <p className="text-white text-lg font-bold">
            {isPractice ? 'Practice SOS' : 'Activating SOS...'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {isPractice ? 'Keep holding — practice mode' : 'Keep holding to send emergency alert'}
          </p>
          <p className="text-gray-600 text-xs mt-3">Release to cancel</p>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════
     RENDER — Activating: Loading
     ═══════════════════════════════════════════════ */
  if (state === 'activating') {
    return (
      <div className="fixed inset-0 z-[200] bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-semibold">Sending Emergency Alert...</p>
          <p className="text-gray-500 text-sm mt-1">Acquiring GPS • Contacting officers • Alerting contacts</p>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════
     RENDER — Active / Practice: Full-screen command center
     ═══════════════════════════════════════════════ */
  const isActive = state === 'active' || state === 'practice' || state === 'confirming_safe'

  if (isActive) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#1a0000] overflow-y-auto">
        {/* Practice watermark */}
        {isPractice && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 opacity-[0.04]">
            <p className="text-[120px] font-black text-white -rotate-45 select-none tracking-[0.3em]">
              PRACTICE
            </p>
          </div>
        )}

        {/* Header */}
        <div className="bg-red-900/40 border-b border-red-800/50 px-4 py-3">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-300 text-sm font-bold tracking-wider uppercase">
                {isPractice ? '⚡ Practice Mode' : 'SOS Active'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-red-400 font-mono text-sm">{formatTime(elapsedTime)}</span>
              {networkState === 'queued' ? (
                <span className="flex items-center gap-1 text-amber-400 text-[10px]">
                  <WifiOff className="w-3 h-3" /> Queued
                </span>
              ) : (
                <span className="flex items-center gap-1 text-green-400 text-[10px]">
                  <Wifi className="w-3 h-3" /> Sent ✓
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-md mx-auto px-4 py-6 space-y-5 relative z-20">

          {/* SMS/WhatsApp Status */}
          {smsSentCount > 0 && (
            <div className="bg-green-950/60 border border-green-800/40 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-400" />
                <span className="text-xs font-bold text-green-300 uppercase tracking-wider">WhatsApp Alerts Sent</span>
              </div>
              <p className="text-green-300 text-sm mt-2">
                ✓ Location shared with {smsSentCount} emergency contact{smsSentCount > 1 ? 's' : ''}
              </p>
              <p className="text-gray-500 text-[10px] mt-1">
                Google Maps link with your coordinates sent via WhatsApp
              </p>
            </div>
          )}

          {smsError && (
            <div className="bg-amber-950/60 border border-amber-800/40 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-300">{smsError}</span>
              </div>
            </div>
          )}

          {/* GPS Status */}
          <div className="bg-red-950/60 border border-red-800/40 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold text-red-300 uppercase tracking-wider">Your Location</span>
            </div>
            {location && location.source !== 'manual' ? (
              <div>
                <p className="text-white text-sm font-mono">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    location.source === 'gps' ? 'bg-green-500/20 text-green-400' :
                    location.source === 'network' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {location.source === 'gps' ? '📡 GPS' : location.source === 'network' ? '📶 Network' : '💾 Cached'}
                  </span>
                  {location.accuracy && (
                    <span className="text-[10px] text-gray-500">±{Math.round(location.accuracy)}m</span>
                  )}
                </div>
                {/* Google Maps link */}
                <a
                  href={`https://maps.google.com/?q=${location.latitude},${location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 mt-2 text-[11px] text-orange-400 hover:text-orange-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open in Google Maps
                </a>
                <p className="text-[10px] text-gray-600 mt-2">
                  Broadcasting every 10 seconds to responding officers
                </p>
              </div>
            ) : (
              <div>
                <p className="text-amber-400 text-sm flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> GPS unavailable
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Alert sent without precise location. Officers notified.
                </p>
              </div>
            )}
          </div>

          {/* Officer Response */}
          <div className="bg-red-950/60 border border-red-800/40 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-red-300 uppercase tracking-wider">Officer Response</span>
            </div>

            {officer ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
                    {officer.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{officer.name}</p>
                    <p className="text-gray-400 text-[11px] capitalize">{officer.rank.replace(/_/g, ' ')} • {officer.badge}</p>
                  </div>
                </div>

                {officer.eta !== null && officer.eta > 0 && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                    <p className="text-blue-300 text-xs font-bold uppercase tracking-wider">Estimated Arrival</p>
                    <p className="text-white text-2xl font-bold font-mono mt-1">{formatETA(officer.eta)}</p>
                  </div>
                )}

                {officer.lastSeen && officer.latitude === null && (
                  <div className="flex items-center gap-1.5 text-amber-400 text-[10px]">
                    <AlertTriangle className="w-3 h-3" />
                    Officer location unavailable — last seen {new Date(officer.lastSeen).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Radio className="w-8 h-8 text-red-400 mx-auto animate-pulse mb-2" />
                <p className="text-red-300 text-sm font-medium">Contacting nearby officers...</p>
                <p className="text-gray-500 text-[10px] mt-1">Auto-escalates to SI → SHO if no response</p>
              </div>
            )}
          </div>

          {/* Emergency fallback */}
          <div className="bg-red-950/60 border border-red-800/40 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">Emergency Contacts</p>
            <div className="space-y-2">
              <a href="tel:112" className="flex items-center gap-3 p-3 bg-red-800/30 rounded-xl hover:bg-red-800/50 transition-colors">
                <Phone className="w-5 h-5 text-white" />
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">Call 112</p>
                  <p className="text-red-300/60 text-[10px]">National Emergency Number</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 -rotate-90" />
              </a>
              <a href="tel:100" className="flex items-center gap-3 p-3 bg-red-800/20 rounded-xl hover:bg-red-800/40 transition-colors">
                <Phone className="w-5 h-5 text-red-300" />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">Call 100</p>
                  <p className="text-red-300/60 text-[10px]">Police Control Room</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 -rotate-90" />
              </a>
            </div>
          </div>

          {/* ── I Am Safe — Two-step deactivation ───── */}
          {state === 'confirming_safe' ? (
            <div className="bg-green-950/60 border border-green-800/40 rounded-2xl p-5 text-center">
              <p className="text-green-300 text-base font-bold mb-2">Confirm you are safe?</p>
              <p className="text-gray-400 text-xs mb-4">
                Doing nothing will keep SOS active ({safeCountdown}s)
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={confirmSafe}
                  className="bg-green-600 hover:bg-green-500 text-white font-bold text-sm px-8 py-3 rounded-xl transition-colors flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Yes, I Am Safe
                </button>
                <button onClick={cancelSafeConfirmation}
                  className="bg-red-800/50 hover:bg-red-800 text-red-300 font-semibold text-sm px-6 py-3 rounded-xl transition-colors">
                  Keep SOS Active
                </button>
              </div>
            </div>
          ) : (
            <button onClick={startSafeConfirmation}
              className="w-full bg-green-900/40 border border-green-800/30 hover:bg-green-900/60 text-green-300 font-bold text-base py-4 rounded-2xl transition-colors flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" />
              I Am Safe
            </button>
          )}

          {/* Muted design note */}
          <p className="text-center text-[9px] text-gray-700 select-none">
            🔇 Muted by design — no sounds or vibrations
          </p>
        </div>
      </div>
    )
  }

  return null
}
