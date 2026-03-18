'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useSHORealtime } from '@/lib/hooks/sho/useSHORealtime'
import {
  Siren, AlertTriangle, Clock, MapPin, Phone, Shield, Users,
  ChevronRight, Loader2, CheckCircle, X, User, Radio,
  Navigation, Battery, Zap, RefreshCw, Eye, ArrowUpRight
} from 'lucide-react'

type SOSAlert = {
  id: string
  citizen_id: string
  station_id: string
  trigger_lat: number
  trigger_lon: number
  emergency_type: string
  status: string
  priority_score: number
  trigger_at: string
  dispatched_at: string | null
  arrived_at: string | null
  resolved_at: string | null
  citizen_name: string
  citizen_mobile: string
  assigned_officer_id: string | null
  assigned_officer_name: string | null
  assigned_officer_rank: string | null
  false_alarm_reason: string | null
  resolution_notes: string | null
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; pulse: boolean }> = {
  TRIGGERED: { color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', label: '🔴 TRIGGERED', pulse: true },
  ACKNOWLEDGED: { color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30', label: '🟠 ACK\'D', pulse: true },
  DISPATCHED: { color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30', label: '🔵 DISPATCHED', pulse: false },
  EN_ROUTE: { color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/30', label: '🟢 EN ROUTE', pulse: false },
  ON_SCENE: { color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30', label: '🟣 ON SCENE', pulse: false },
  ESCALATED: { color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30', label: '⚠️ ESCALATED', pulse: true },
  RESOLVED: { color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30', label: '✅ RESOLVED', pulse: false },
  FALSE_ALARM: { color: 'text-gray-400', bg: 'bg-gray-500/15 border-gray-500/30', label: '❌ FALSE ALARM', pulse: false },
  CANCELLED: { color: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/20', label: 'Cancelled', pulse: false },
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-400 bg-red-500/10 border-red-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  low: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
}

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const elapsed = (d: string) => {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

export default function SOSCommandPage() {
  const { user } = useCurrentUser()
  const supabase = createClient()

  const [activeAlerts, setActiveAlerts] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null)
  const [tab, setTab] = useState<'active' | 'history'>('active')
  const [officers, setOfficers] = useState<any[]>([])
  const [processing, setProcessing] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [falseAlarmModalOpen, setFalseAlarmModalOpen] = useState(false)
  const [resolveNotes, setResolveNotes] = useState('')
  const [falseAlarmReason, setFalseAlarmReason] = useState('')
  const [selectedOfficer, setSelectedOfficer] = useState('')
  const [now, setNow] = useState(Date.now()) // for live timer

  // Live clock refresh
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(i)
  }, [])

  const loadAlerts = useCallback(async () => {
    if (!user?.stationId) return

    // Active SOS alerts from sos_events table (legacy)
    const { data: events } = await supabase
      .from('sos_events')
      .select(`
        *,
        profiles!user_id(full_name, phone)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (events) {
      const active: any[] = []
      const hist: any[] = []
      events.forEach(e => {
        const alert = {
          id: e.id,
          citizen_id: e.user_id,
          trigger_lat: e.latitude,
          trigger_lon: e.longitude,
          trigger_at: e.created_at,
          status: e.resolved_at ? 'RESOLVED' : e.responded_by ? 'DISPATCHED' : 'TRIGGERED',
          citizen_name: (e as any).profiles?.full_name || 'Unknown',
          citizen_mobile: (e as any).profiles?.phone || '—',
          assigned_officer_id: e.responded_by,
          dispatched_at: e.responded_at,
          resolved_at: e.resolved_at,
          emergency_type: 'SOS',
          priority_score: e.practice_mode ? 0 : 80,
          practice_mode: e.practice_mode,
        }
        if (e.resolved_at || e.practice_mode) {
          hist.push(alert)
        } else {
          active.push(alert)
        }
      })
      setActiveAlerts(active)
      setHistory(hist)
    }

    // Load officers
    if (user.stationId) {
      const { data: stationOfficers } = await supabase
        .from('officer_profiles')
        .select('id, badge_number, rank')
        .eq('station_id', user.stationId)

      if (stationOfficers) {
        const enriched = await Promise.all(stationOfficers.map(async (o: any) => {
          const { data: p } = await supabase.from('profiles').select('full_name').eq('id', o.id).single()
          return { ...o, full_name: p?.full_name || 'Unknown' }
        }))
        setOfficers(enriched)
      }
    }

    setLoading(false)
  }, [user?.stationId])

  useEffect(() => { loadAlerts() }, [loadAlerts])

  // Realtime
  useSHORealtime(user?.stationId, user?.id, {
    onSOSUpdate: () => loadAlerts(),
  })

  const selected = [...activeAlerts, ...history].find(a => a.id === selectedAlert)

  // ── Actions ──────────────────────────────────────────────
  const handleAssign = async () => {
    if (!selected || !selectedOfficer) return
    setProcessing(true)
    await supabase.from('sos_events').update({
      responded_by: selectedOfficer,
      responded_at: new Date().toISOString(),
    }).eq('id', selected.id)
    setProcessing(false)
    setAssignModalOpen(false)
    setSelectedOfficer('')
    loadAlerts()
  }

  const handleResolve = async () => {
    if (!selected) return
    setProcessing(true)
    await supabase.from('sos_events').update({
      resolved_at: new Date().toISOString(),
    }).eq('id', selected.id)
    setProcessing(false)
    setResolveModalOpen(false)
    setResolveNotes('')
    setSelectedAlert(null)
    loadAlerts()
  }

  const handleFalseAlarm = async () => {
    if (!selected) return
    setProcessing(true)
    await supabase.from('sos_events').update({
      resolved_at: new Date().toISOString(),
      practice_mode: true,
    }).eq('id', selected.id)
    setProcessing(false)
    setFalseAlarmModalOpen(false)
    setFalseAlarmReason('')
    setSelectedAlert(null)
    loadAlerts()
  }

  const alerts = tab === 'active' ? activeAlerts : history

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            activeAlerts.length > 0
              ? 'bg-red-500/20 border border-red-500/30 animate-pulse'
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <Siren className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-white">SOS Command Center</h1>
            <p className="text-xs text-gray-500">Emergency response management · Real-time monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeAlerts.length > 0 && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl animate-pulse">
              <Siren className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-400 font-bold">{activeAlerts.length} ACTIVE ALERT{activeAlerts.length > 1 ? 'S' : ''}</span>
            </div>
          )}
          <button onClick={loadAlerts}
            className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white bg-[#111827] border border-[#1F2D42] px-3 py-2 rounded-xl transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Alerts', value: activeAlerts.length, color: activeAlerts.length > 0 ? 'text-red-400' : 'text-gray-400', icon: Siren, iconColor: 'text-red-500' },
          { label: 'Dispatched', value: activeAlerts.filter(a => a.assigned_officer_id).length, color: 'text-blue-400', icon: Radio, iconColor: 'text-blue-500' },
          { label: 'Total Today', value: [...activeAlerts, ...history].filter(a => new Date(a.trigger_at).toDateString() === new Date().toDateString()).length, color: 'text-white', icon: AlertTriangle, iconColor: 'text-gray-500' },
          { label: 'Resolved', value: history.length, color: 'text-green-400', icon: CheckCircle, iconColor: 'text-green-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#111827] border border-[#1F2D42] rounded-xl p-3 flex items-center gap-3">
            <stat.icon className={`w-4 h-4 ${stat.iconColor} flex-shrink-0`} />
            <div>
              <p className={`text-lg font-heading font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111827] border border-[#1F2D42] rounded-xl p-1">
        {(['active', 'history'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setSelectedAlert(null) }}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${
              tab === t ? 'bg-[#0B0F1A] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'active' ? `Active (${activeAlerts.length})` : `History (${history.length})`}
          </button>
        ))}
      </div>

      {/* Alert List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl py-16 text-center">
          <Siren className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-white font-medium">
            {tab === 'active' ? 'No active SOS alerts' : 'No SOS history'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {tab === 'active' ? 'Station is all clear' : 'Past alerts will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => {
            const sc = STATUS_CONFIG[alert.status] || STATUS_CONFIG.TRIGGERED
            const isSelected = selectedAlert === alert.id
            const elapsedTime = elapsed(alert.trigger_at)

            return (
              <div key={alert.id} className={`bg-[#111827] border rounded-2xl transition-all ${
                isSelected ? 'border-red-500/30 shadow-lg shadow-red-500/5' : 'border-[#1F2D42] hover:border-[#2A3A52]'
              } ${sc.pulse && tab === 'active' ? 'animate-pulse-slow' : ''}`}>
                {/* Alert Row */}
                <button onClick={() => setSelectedAlert(isSelected ? null : alert.id)}
                  className="w-full text-left p-5 flex items-center gap-4"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${sc.bg} flex-shrink-0`}>
                    <Siren className={`w-6 h-6 ${sc.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sc.bg} ${sc.color}`}>
                        {sc.label}
                      </span>
                      {alert.practice_mode && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 font-bold">PRACTICE</span>
                      )}
                      <span className="text-[10px] text-gray-600 font-mono">{alert.id.slice(0, 8)}</span>
                    </div>
                    <p className="text-sm text-white font-medium">{alert.citizen_name}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(alert.trigger_at)}</span>
                      {tab === 'active' && (
                        <span className="text-red-400 font-bold flex items-center gap-1">
                          <Zap className="w-3 h-3" /> {elapsedTime}
                        </span>
                      )}
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {alert.citizen_mobile}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {alert.assigned_officer_id && (
                      <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg hidden sm:inline">
                        Officer Assigned
                      </span>
                    )}
                    <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {/* Expanded Detail */}
                {isSelected && (
                  <div className="border-t border-[#1F2D42] p-5 space-y-4">
                    {/* Location + Contact */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Latitude</p>
                        <p className="text-xs text-gray-300 font-mono">{alert.trigger_lat?.toFixed(6) || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Longitude</p>
                        <p className="text-xs text-gray-300 font-mono">{alert.trigger_lon?.toFixed(6) || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Phone</p>
                        <p className="text-xs text-gray-300">{alert.citizen_mobile}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Triggered</p>
                        <p className="text-xs text-gray-300">{new Date(alert.trigger_at).toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Map link */}
                    {alert.trigger_lat && alert.trigger_lon && (
                      <a href={`https://www.google.com/maps?q=${alert.trigger_lat},${alert.trigger_lon}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 hover:bg-blue-500/20 transition-colors"
                      >
                        <MapPin className="w-4 h-4" />
                        Open Location in Google Maps
                        <ArrowUpRight className="w-3 h-3 ml-auto" />
                      </a>
                    )}

                    {/* Actions */}
                    {tab === 'active' && (
                      <div className="flex gap-2 flex-wrap">
                        {!alert.assigned_officer_id && (
                          <button onClick={() => setAssignModalOpen(true)}
                            className="flex items-center gap-1.5 text-xs font-semibold bg-blue-500 text-white rounded-xl px-4 py-2.5 hover:bg-blue-600 transition-colors"
                          >
                            <Users className="w-3.5 h-3.5" /> Dispatch Officer
                          </button>
                        )}
                        <button onClick={() => setResolveModalOpen(true)}
                          className="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5 hover:bg-green-500/20 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
                        </button>
                        <button onClick={() => setFalseAlarmModalOpen(true)}
                          className="flex items-center gap-1.5 text-xs font-medium text-gray-400 bg-gray-500/10 border border-gray-500/20 rounded-xl px-4 py-2.5 hover:bg-gray-500/20 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> False Alarm
                        </button>
                        {alert.citizen_mobile && alert.citizen_mobile !== '—' && (
                          <a href={`tel:${alert.citizen_mobile}`}
                            className="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5 hover:bg-green-500/20 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call Citizen
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────── */}

      {/* Assign Officer Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Dispatch Officer
              </h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <select value={selectedOfficer} onChange={e => setSelectedOfficer(e.target.value)}
              className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/40"
            >
              <option value="">— Select Officer —</option>
              {officers.map(o => (
                <option key={o.id} value={o.id}>{o.full_name} ({o.rank} · {o.badge_number})</option>
              ))}
            </select>
            <button onClick={handleAssign} disabled={processing || !selectedOfficer}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-blue-500 text-white rounded-xl py-3 hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
              Confirm Dispatch
            </button>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" /> Resolve Alert
              </h3>
              <button onClick={() => setResolveModalOpen(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)}
              placeholder="Resolution notes (optional)..."
              rows={3}
              className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl px-3 py-2.5 text-sm text-white outline-none resize-none placeholder:text-gray-600"
            />
            <button onClick={handleResolve} disabled={processing}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-green-500 text-white rounded-xl py-3 hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Confirm Resolution
            </button>
          </div>
        </div>
      )}

      {/* False Alarm Modal */}
      {falseAlarmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" /> Mark as False Alarm
              </h3>
              <button onClick={() => setFalseAlarmModalOpen(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea value={falseAlarmReason} onChange={e => setFalseAlarmReason(e.target.value)}
              placeholder="Reason for marking as false alarm..."
              rows={3}
              className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl px-3 py-2.5 text-sm text-white outline-none resize-none placeholder:text-gray-600"
            />
            <button onClick={handleFalseAlarm} disabled={processing}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-yellow-500 text-black rounded-xl py-3 hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Confirm False Alarm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
