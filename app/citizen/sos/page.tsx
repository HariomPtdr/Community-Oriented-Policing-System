'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Siren, Clock, Smartphone, Phone, Satellite, MessageSquare,
  Save, Loader2, CheckCircle, AlertTriangle, Trash2,
  Plus, Shield, ChevronRight, Zap, MapPin,
  RotateCcw, Fingerprint, Timer, ArrowRight,
  Vibrate, Eye, BatteryLow, Signal, PhoneCall, Wifi,
  History, Activity, Bell, UserCheck, Lock, ExternalLink
} from 'lucide-react'
import { loadLocalSettings, saveLocalSettings, type SOSSettings, DEFAULT_SETTINGS } from '@/lib/sos'

export default function SOSSettingsPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<SOSSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [newContact, setNewContact] = useState('')
  const [contactError, setContactError] = useState('')
  const [sosHistory, setSosHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings')
  const [testingHold, setTestingHold] = useState(false)
  const [testProgress, setTestProgress] = useState(0)
  const testTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const originalSettingsRef = useRef<SOSSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    const loaded = loadLocalSettings()
    setSettings(loaded)
    originalSettingsRef.current = loaded

    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load history
      const { data } = await supabase
        .from('sos_events')
        .select('id, created_at, status, is_practice, latitude, longitude, location_source, location_accuracy, responded_by, resolved_at, cancelled_at, escalation_level, sms_sent_to')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setSosHistory(data || [])
      setLoadingHistory(false)

      // Sync settings from server
      const { data: serverSettings } = await supabase
        .from('sos_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (serverSettings) {
        const merged: SOSSettings = {
          holdDuration: serverSettings.hold_duration || 2,
          shakeEnabled: serverSettings.shake_enabled || false,
          emergencyContacts: serverSettings.emergency_contacts || [],
          gpsAccuracy: serverSettings.gps_accuracy || 'high',
          smsAlert: serverSettings.sms_alert || false,
        }
        setSettings(merged)
        originalSettingsRef.current = merged
        saveLocalSettings(merged)
      }
    }
    loadData()
  }, [])

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettingsRef.current)
    setHasChanges(changed)
  }, [settings])

  const saveSettings = async () => {
    setSaving(true)
    setSaved(false)
    saveLocalSettings(settings)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('sos_settings').upsert({
        user_id: user.id,
        hold_duration: settings.holdDuration,
        shake_enabled: settings.shakeEnabled,
        emergency_contacts: settings.emergencyContacts,
        gps_accuracy: settings.gpsAccuracy,
        sms_alert: settings.smsAlert,
      })
    }

    originalSettingsRef.current = { ...settings }
    setSaving(false)
    setSaved(true)
    setHasChanges(false)
    setTimeout(() => setSaved(false), 3000)
  }

  // ── Phone number validation ───────────────────────────
  const sanitizePhone = (input: string): string => {
    // Remove all non-digit characters
    return input.replace(/\D/g, '')
  }

  const validatePhone = (phone: string): { valid: boolean; error: string; normalized: string } => {
    const digits = sanitizePhone(phone)

    // Remove leading country code if present
    let normalized = digits
    if (digits.startsWith('91') && digits.length === 12) {
      normalized = digits.slice(2)
    } else if (digits.startsWith('0') && digits.length === 11) {
      normalized = digits.slice(1)
    }

    if (normalized.length === 0) {
      return { valid: false, error: 'Enter a phone number', normalized: '' }
    }
    if (normalized.length !== 10) {
      return { valid: false, error: `Must be exactly 10 digits (got ${normalized.length})`, normalized }
    }
    if (!/^[6-9]/.test(normalized)) {
      return { valid: false, error: 'Indian mobile numbers start with 6, 7, 8, or 9', normalized }
    }
    // Check for obviously invalid patterns
    if (/^(\d)\1{9}$/.test(normalized)) {
      return { valid: false, error: 'This doesn\'t look like a real number', normalized }
    }
    // Check for duplicates
    if (settings.emergencyContacts.includes(normalized)) {
      return { valid: false, error: 'This contact is already added', normalized }
    }
    return { valid: true, error: '', normalized }
  }

  const handlePhoneInput = (value: string) => {
    // Allow only digits, +, spaces
    const cleaned = value.replace(/[^0-9+\s]/g, '')
    setNewContact(cleaned)
    setContactError('')
  }

  const addContact = () => {
    const { valid, error, normalized } = validatePhone(newContact)
    if (!valid) {
      setContactError(error)
      return
    }
    if (settings.emergencyContacts.length >= 5) {
      setContactError('Maximum 5 contacts allowed')
      return
    }
    setSettings(prev => ({ ...prev, emergencyContacts: [...prev.emergencyContacts, normalized] }))
    setNewContact('')
    setContactError('')
  }

  const removeContact = (idx: number) => {
    setSettings(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== idx)
    }))
  }

  const startTestHold = () => {
    setTestingHold(true)
    setTestProgress(0)
    const duration = settings.holdDuration * 1000
    const start = Date.now()
    testTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      setTestProgress(progress)
      if (progress >= 1) {
        if (testTimerRef.current) clearInterval(testTimerRef.current)
        setTimeout(() => {
          setTestingHold(false)
          setTestProgress(0)
        }, 800)
      }
    }, 16)
  }

  const cancelTestHold = () => {
    if (testTimerRef.current) clearInterval(testTimerRef.current)
    setTestingHold(false)
    setTestProgress(0)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }

  const getDuration = (start: string, end: string | null) => {
    if (!end) return 'Ongoing'
    const diff = new Date(end).getTime() - new Date(start).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '<1 min'
    if (mins < 60) return `${mins} min`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  const formatPhoneDisplay = (phone: string) => {
    if (phone.length === 10) {
      return `${phone.slice(0, 5)} ${phone.slice(5)}`
    }
    return phone
  }

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* ─── Hero Header ─────────────────────────────── */}
      <div className="relative mb-8 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/80 via-red-900/40 to-orange-950/60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.15),transparent_60%)]" />
        <div className="relative px-6 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <Siren className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Emergency SOS</h1>
                <p className="text-xs text-gray-400">Configure your personal safety settings</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-semibold px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              System Active
            </div>
          </div>
        </div>
      </div>

      {/* ─── Important Notice ────────────────────────── */}
      <div className="bg-gradient-to-r from-red-500/5 to-orange-500/5 border border-red-500/15 rounded-2xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-red-300 font-semibold">Critical Safety Feature</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              SOS alerts nearby officers with your GPS coordinates and shares your <span className="text-amber-400 font-medium">live Google Maps location</span> with emergency contacts via WhatsApp/SMS.
              Use the <span className="text-orange-400 font-medium">Practice Mode</span> button on your dashboard to familiarize yourself.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Tab Switcher ────────────────────────────── */}
      <div className="flex items-center gap-1 bg-[#0D1420] rounded-xl p-1 mb-6 border border-[#1F2D42]/50">
        {(['settings', 'history'] as const).map(tab => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-[#111827] text-white shadow-sm border border-[#1F2D42]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'settings' ? <Shield className="w-4 h-4" /> : <History className="w-4 h-4" />}
            {tab === 'settings' ? 'Settings' : `History (${sosHistory.length})`}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════
           SETTINGS TAB
         ═══════════════════════════════════════════════ */}
      {activeTab === 'settings' && (
        <div className="space-y-5">

          {/* ─── Row 1: Activation Settings ──────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Hold Duration */}
            <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5 group hover:border-orange-500/20 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Timer className="w-4 h-4 text-orange-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-white">Hold Duration</h2>
                </div>
                <span className="text-[10px] text-orange-400/60 font-mono">{settings.holdDuration}s</span>
              </div>
              <p className="text-[11px] text-gray-500 mb-4 ml-10">
                Time to hold the SOS button before activation
              </p>

              <div className="flex gap-1.5 mb-4">
                {[
                  { val: 1.5, label: '1.5s', desc: 'Fast' },
                  { val: 2, label: '2s', desc: 'Default' },
                  { val: 3, label: '3s', desc: 'Safe' },
                ].map(({ val, label, desc }) => (
                  <button key={val}
                    onClick={() => setSettings(prev => ({ ...prev, holdDuration: val }))}
                    className={`flex-1 py-2.5 rounded-xl text-center transition-all ${
                      settings.holdDuration === val
                        ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                        : 'bg-[#0D1420] border border-[#1F2D42] text-gray-400 hover:border-orange-500/30'
                    }`}
                  >
                    <p className="text-sm font-bold">{label}</p>
                    <p className={`text-[9px] mt-0.5 ${settings.holdDuration === val ? 'text-black/60' : 'text-gray-600'}`}>{desc}</p>
                  </button>
                ))}
              </div>

              {/* Live test area */}
              <div className="bg-[#0D1420] rounded-xl p-3 border border-[#1F2D42]/50">
                <p className="text-[10px] text-gray-600 mb-2 text-center">Test your hold duration</p>
                <button
                  onMouseDown={startTestHold}
                  onMouseUp={cancelTestHold}
                  onMouseLeave={cancelTestHold}
                  onTouchStart={(e) => { e.preventDefault(); startTestHold() }}
                  onTouchEnd={cancelTestHold}
                  className="w-full relative h-10 rounded-lg bg-[#1a1a2e] border border-[#2a2a3e] overflow-hidden"
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500/30 to-orange-500/50 transition-none"
                    style={{ width: `${testProgress * 100}%` }}
                  />
                  <span className={`relative z-10 text-xs font-medium ${
                    testProgress >= 1 ? 'text-green-400' : testingHold ? 'text-orange-300' : 'text-gray-500'
                  }`}>
                    {testProgress >= 1 ? '✓ SOS would activate!' : testingHold ? `Holding... ${(testProgress * settings.holdDuration).toFixed(1)}s` : 'Hold to test'}
                  </span>
                </button>
              </div>
            </div>

            {/* GPS Accuracy */}
            <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5 group hover:border-green-500/20 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Satellite className="w-4 h-4 text-green-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-white">Location Accuracy</h2>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mb-4 ml-10">
                How precisely your location is sent to officers
              </p>

              <div className="space-y-2">
                {([
                  {
                    val: 'high' as const,
                    label: 'High Accuracy',
                    desc: 'Uses GPS hardware for highest precision (±5m)',
                    icon: Signal,
                    extra: 'Uses more battery',
                    color: 'green'
                  },
                  {
                    val: 'balanced' as const,
                    label: 'Balanced',
                    desc: 'Uses network location, faster but less accurate (±50m)',
                    icon: Wifi,
                    extra: 'Battery friendly',
                    color: 'blue'
                  },
                ]).map(({ val, label, desc, icon: Icon, extra, color }) => (
                  <button key={val}
                    onClick={() => setSettings(prev => ({ ...prev, gpsAccuracy: val }))}
                    className={`w-full text-left p-3.5 rounded-xl transition-all flex items-start gap-3 ${
                      settings.gpsAccuracy === val
                        ? `bg-${color}-500/10 border border-${color}-500/25`
                        : 'bg-[#0D1420] border border-[#1F2D42] hover:border-gray-600'
                    }`}
                    style={settings.gpsAccuracy === val ? {
                      backgroundColor: color === 'green' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)',
                      borderColor: color === 'green' ? 'rgba(34,197,94,0.25)' : 'rgba(59,130,246,0.25)',
                    } : {}}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${
                      settings.gpsAccuracy === val ? 'bg-white/10' : 'bg-[#1a1a2e]'
                    }`}>
                      <Icon className={`w-3.5 h-3.5 ${settings.gpsAccuracy === val ? (color === 'green' ? 'text-green-400' : 'text-blue-400') : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${settings.gpsAccuracy === val ? 'text-white' : 'text-gray-400'}`}>{label}</p>
                        {settings.gpsAccuracy === val && (
                          <CheckCircle className={`w-3.5 h-3.5 ${color === 'green' ? 'text-green-400' : 'text-blue-400'}`} />
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">{desc}</p>
                      <p className={`text-[9px] mt-1 ${color === 'green' ? 'text-amber-500/60' : 'text-green-500/60'}`}>
                        {color === 'green' ? <BatteryLow className="w-2.5 h-2.5 inline mr-0.5" /> : null}
                        {extra}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Row 2: Toggles ──────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Shake to SOS */}
            <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5 hover:border-blue-500/20 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mt-0.5">
                    <Vibrate className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Shake to SOS</h2>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed max-w-[250px]">
                      Requires <span className="text-blue-400 font-medium">3 hard shakes</span> within 1.5 seconds.
                      Useful when you can't look at the screen.
                    </p>
                    {settings.shakeEnabled && (
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-500/80">
                        <AlertTriangle className="w-3 h-3" />
                        May trigger from drops or running
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, shakeEnabled: !prev.shakeEnabled }))}
                  className={`w-12 h-7 rounded-full transition-all relative flex-shrink-0 mt-1 ${
                    settings.shakeEnabled ? 'bg-blue-500 shadow-lg shadow-blue-500/30' : 'bg-gray-700'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-md transition-transform ${
                    settings.shakeEnabled ? 'translate-x-[26px]' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* SMS Alert */}
            <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5 hover:border-amber-500/20 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center mt-0.5">
                    <MessageSquare className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">SMS / WhatsApp Alerts</h2>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed max-w-[250px]">
                      Share your <span className="text-amber-400 font-medium">Google Maps live location</span> via
                      WhatsApp to your emergency contacts when SOS activates.
                    </p>
                    {settings.smsAlert && settings.emergencyContacts.length === 0 && (
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        Add contacts below to enable
                      </div>
                    )}
                    {settings.smsAlert && settings.emergencyContacts.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        Will send to {settings.emergencyContacts.length} contact{settings.emergencyContacts.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, smsAlert: !prev.smsAlert }))}
                  className={`w-12 h-7 rounded-full transition-all relative flex-shrink-0 mt-1 ${
                    settings.smsAlert ? 'bg-amber-500 shadow-lg shadow-amber-500/30' : 'bg-gray-700'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-md transition-transform ${
                    settings.smsAlert ? 'translate-x-[26px]' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* ─── Emergency Contacts ──────────────────── */}
          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5 hover:border-purple-500/20 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-purple-400" />
                </div>
                <h2 className="text-sm font-semibold text-white">Emergency Contacts</h2>
              </div>
              <span className="text-[11px] text-gray-500 bg-[#0D1420] px-2.5 py-1 rounded-lg border border-[#1F2D42]/50">
                {settings.emergencyContacts.length} / 5
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mb-4 ml-10">
              These contacts will receive your live Google Maps location via WhatsApp when SOS activates
            </p>

            {/* Contact List */}
            <div className="space-y-2 mb-3">
              {settings.emergencyContacts.length === 0 ? (
                <div className="bg-[#0D1420] border border-dashed border-[#1F2D42] rounded-xl p-4 text-center">
                  <Phone className="w-5 h-5 text-gray-700 mx-auto mb-1.5" />
                  <p className="text-xs text-gray-600">No emergency contacts added</p>
                  <p className="text-[10px] text-gray-700 mt-0.5">Add a 10-digit mobile number below</p>
                </div>
              ) : (
                settings.emergencyContacts.map((phone, i) => (
                  <div key={i} className="flex items-center gap-3 bg-[#0D1420] border border-[#1F2D42]/50 rounded-xl p-3 group/contact hover:border-purple-500/20 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm text-white font-mono tracking-wide">{formatPhoneDisplay(phone)}</span>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        {settings.smsAlert ? '✓ Will receive WhatsApp location' : 'WhatsApp alerts disabled'}
                      </p>
                    </div>
                    <button onClick={() => removeContact(i)}
                      className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover/contact:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add new */}
            {settings.emergencyContacts.length < 5 && (
              <div>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Phone className="w-3.5 h-3.5 text-gray-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={newContact}
                      onChange={e => handlePhoneInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addContact()}
                      placeholder="10-digit mobile number"
                      maxLength={15}
                      className={`w-full bg-[#0D1420] border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none font-mono transition-colors ${
                        contactError ? 'border-red-500/50 focus:border-red-500' : 'border-[#1F2D42] focus:border-purple-500/50'
                      }`}
                    />
                  </div>
                  <button onClick={addContact}
                    disabled={!newContact.trim()}
                    className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-30 px-4 rounded-xl transition-all hover:scale-105 disabled:hover:scale-100 flex items-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    <span className="text-xs font-medium hidden sm:inline">Add</span>
                  </button>
                </div>
                {contactError && (
                  <p className="text-[11px] text-red-400 mt-1.5 ml-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {contactError}
                  </p>
                )}
                <p className="text-[10px] text-gray-700 mt-1.5 ml-1">
                  Enter 10-digit Indian mobile number (e.g., 9876543210)
                </p>
              </div>
            )}
          </div>

          {/* ─── How It Works ────────────────────────── */}
          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-cyan-400" />
              </div>
              <h2 className="text-sm font-semibold text-white">How SOS Works</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {[
                { step: 1, icon: Fingerprint, title: 'Hold to Activate', desc: `Hold the red SOS button for ${settings.holdDuration}s. Release anytime to cancel.`, color: 'red' },
                { step: 2, icon: MapPin, title: 'Location Sent', desc: 'Your GPS coordinates are broadcast to nearby officers every 10 seconds.', color: 'green' },
                { step: 3, icon: MessageSquare, title: 'Contacts Alerted', desc: 'WhatsApp message with your Google Maps location is sent to emergency contacts.', color: 'amber' },
                { step: 4, icon: UserCheck, title: 'Officer Responds', desc: 'Nearest officer accepts and their ETA is shown in real-time.', color: 'blue' },
              ].map(({ step, icon: Icon, title, desc, color }) => (
                <div key={step} className="bg-[#0D1420] border border-[#1F2D42]/50 rounded-xl p-4 relative">
                  <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-[#111827] border border-[#1F2D42] flex items-center justify-center text-[10px] text-gray-500 font-bold">
                    {step}
                  </div>
                  <Icon className={`w-5 h-5 mb-2 ${
                    color === 'red' ? 'text-red-400' : color === 'green' ? 'text-green-400' : color === 'amber' ? 'text-amber-400' : 'text-blue-400'
                  }`} />
                  <p className="text-xs font-semibold text-white mb-1">{title}</p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            {/* Safety features row */}
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { icon: Eye, label: 'Visual only — no sounds', color: 'text-gray-500' },
                { icon: Wifi, label: 'Works offline', color: 'text-gray-500' },
                { icon: Lock, label: 'Screen stays on', color: 'text-gray-500' },
                { icon: RotateCcw, label: 'Auto-retry on failure', color: 'text-gray-500' },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-1.5 bg-[#0D1420] border border-[#1F2D42]/30 rounded-full px-3 py-1.5">
                  <Icon className={`w-3 h-3 ${color}`} />
                  <span className="text-[10px] text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Save Bar ────────────────────────────── */}
          <div className={`sticky bottom-4 z-50 transition-all ${hasChanges || saved ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
            <div className="bg-[#111827]/95 backdrop-blur-sm border border-[#1F2D42] rounded-2xl p-4 flex items-center justify-between shadow-2xl shadow-black/50">
              <div className="flex items-center gap-2">
                {saved ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400 font-medium">Settings saved successfully</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    <span className="text-sm text-gray-400">You have unsaved changes</span>
                  </>
                )}
              </div>
              {!saved && (
                <button onClick={saveSettings} disabled={saving}
                  className="bg-orange-500 hover:bg-orange-400 disabled:bg-orange-500/50 text-black font-semibold text-sm px-5 py-2 rounded-xl transition-colors flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
           HISTORY TAB
         ═══════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div>
          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin mb-3" />
              <p className="text-sm text-gray-500">Loading SOS history...</p>
            </div>
          ) : sosHistory.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[#111827] border border-[#1F2D42] flex items-center justify-center mx-auto mb-4">
                <Siren className="w-7 h-7 text-gray-700" />
              </div>
              <p className="text-sm text-gray-400 font-medium">No SOS events yet</p>
              <p className="text-xs text-gray-600 mt-1">Your SOS history will appear here when you activate an emergency alert</p>
              <p className="text-[10px] text-gray-700 mt-4">Tip: Try <span className="text-orange-400">Practice Mode</span> from the dashboard to test the feature</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Stats bar */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Total', val: sosHistory.length, color: 'text-white' },
                  { label: 'Practice', val: sosHistory.filter(e => e.is_practice).length, color: 'text-blue-400' },
                  { label: 'Real', val: sosHistory.filter(e => !e.is_practice).length, color: 'text-red-400' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-[#111827] border border-[#1F2D42] rounded-xl p-3 text-center">
                    <p className={`text-lg font-bold ${color}`}>{val}</p>
                    <p className="text-[10px] text-gray-500">{label}</p>
                  </div>
                ))}
              </div>

              {/* Event cards */}
              {sosHistory.map(event => (
                <div key={event.id}
                  className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-4 hover:border-gray-600 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      event.is_practice ? 'bg-blue-500/10 border border-blue-500/20' :
                      event.status === 'active' ? 'bg-red-500/10 border border-red-500/20' :
                      event.status === 'resolved' ? 'bg-green-500/10 border border-green-500/20' :
                      'bg-gray-500/10 border border-gray-500/20'
                    }`}>
                      {event.is_practice ? (
                        <Zap className="w-4 h-4 text-blue-400" />
                      ) : event.status === 'active' ? (
                        <Siren className="w-4 h-4 text-red-400 animate-pulse" />
                      ) : event.status === 'resolved' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <RotateCcw className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-white font-medium">
                          {event.is_practice ? 'Practice Drill' : 'Emergency SOS'}
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          event.status === 'active' ? 'bg-red-500/20 text-red-400' :
                          event.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                          event.status === 'cancelled' ? 'bg-gray-500/20 text-gray-400' :
                          event.status === 'responded' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {event.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(event.created_at)} at {formatTime(event.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          {getDuration(event.created_at, event.resolved_at || event.cancelled_at)}
                        </span>
                        {event.location_source && (
                          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                            event.location_source === 'gps' ? 'bg-green-500/10 text-green-400' :
                            event.location_source === 'network' ? 'bg-blue-500/10 text-blue-400' :
                            event.location_source === 'cached' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-gray-500/10 text-gray-400'
                          }`}>
                            <Satellite className="w-3 h-3" />
                            {event.location_source.toUpperCase()}
                            {event.location_accuracy && ` ±${Math.round(event.location_accuracy)}m`}
                          </span>
                        )}
                      </div>

                      {/* SMS sent indicator */}
                      {event.sms_sent_to && event.sms_sent_to.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-green-400/70">
                          <MessageSquare className="w-3 h-3" />
                          WhatsApp sent to {event.sms_sent_to.length} contact{event.sms_sent_to.length > 1 ? 's' : ''}
                        </div>
                      )}

                      {/* Coordinates */}
                      {event.latitude && event.longitude && event.latitude !== 0 && (
                        <a href={`https://maps.google.com/?q=${event.latitude},${event.longitude}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-orange-400/60 hover:text-orange-400 transition-colors mt-1.5">
                          <MapPin className="w-3 h-3" />
                          {event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
