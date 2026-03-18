'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import {
  Map, Users, Radio, Clock, Shield, MapPin, Activity, ChevronRight,
  Loader2, RefreshCw, Eye, Navigation, Battery, Zap, AlertTriangle,
  CheckCircle, User, Search, Filter
} from 'lucide-react'

type OfficerLocation = {
  id: string
  full_name: string
  rank: string
  badge_number: string
  op_status: string
  duty_status: string
  current_lat: number | null
  current_lon: number | null
  last_gps_update: string | null
  device_battery_pct: number | null
  shift_status: string | null
}

const STATUS_COLORS: Record<string, { dot: string; text: string; bg: string; label: string }> = {
  ACTIVE: { dot: 'bg-green-400', text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', label: 'Active' },
  AVAILABLE: { dot: 'bg-green-400', text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', label: 'Available' },
  BUSY: { dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Busy' },
  EN_ROUTE: { dot: 'bg-blue-400', text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', label: 'En Route' },
  ON_SCENE: { dot: 'bg-purple-400', text: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', label: 'On Scene' },
  OFF_DUTY: { dot: 'bg-gray-400', text: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/20', label: 'Off Duty' },
  ON_LEAVE: { dot: 'bg-gray-400', text: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/20', label: 'On Leave' },
}

const timeAgo = (d: string | null) => {
  if (!d) return 'Never'
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function PatrolOversightPage() {
  const { user } = useCurrentUser()
  const supabase = createClient()

  const [officers, setOfficers] = useState<OfficerLocation[]>([])
  const [patrolLogs, setPatrolLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [tab, setTab] = useState<'map' | 'logs'>('map')
  const [selectedOfficer, setSelectedOfficer] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!user?.stationId) return

    // Load officers with locations
    const { data: officerData } = await supabase
      .from('officer_profiles')
      .select('id, badge_number, rank')
      .eq('station_id', user.stationId)

    if (officerData) {
      const enriched = await Promise.all(officerData.map(async (o: any) => {
        const { data: p } = await supabase.from('profiles').select('full_name').eq('id', o.id).single()
        return {
          ...o,
          full_name: p?.full_name || 'Unknown',
          op_status: o.op_status || 'ACTIVE',
          duty_status: o.duty_status || 'ACTIVE',
          current_lat: null,
          current_lon: null,
          last_gps_update: null,
          device_battery_pct: null,
          shift_status: null,
        }
      }))
      setOfficers(enriched)
    }

    // Load recent patrol logs
    const { data: logs } = await supabase
      .from('patrol_logs')
      .select(`
        *,
        profiles!officer_id(full_name)
      `)
      .order('started_at', { ascending: false })
      .limit(20)

    setPatrolLogs(logs || [])
    setLoading(false)
  }, [user?.stationId])

  useEffect(() => { loadData() }, [loadData])

  // Realtime officer location updates
  useEffect(() => {
    if (!user?.stationId) return
    const supabase2 = createClient()
    const channel = supabase2.channel('patrol-gps')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'officer_profiles',
      }, () => loadData())
      .subscribe()
    return () => { supabase2.removeChannel(channel) }
  }, [user?.stationId, loadData])

  // Filter officers
  const filteredOfficers = officers.filter(o => {
    const matchSearch = !searchQuery ||
      o.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.badge_number?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = filterStatus === 'all' || o.op_status === filterStatus || o.duty_status === filterStatus
    return matchSearch && matchStatus
  })

  const stats = {
    total: officers.length,
    active: officers.filter(o => o.duty_status === 'ACTIVE' || o.op_status === 'AVAILABLE').length,
    onPatrol: officers.filter(o => o.shift_status === 'ACTIVE' || o.op_status === 'EN_ROUTE').length,
    withGPS: officers.filter(o => o.current_lat !== null).length,
  }

  const selected = officers.find(o => o.id === selectedOfficer)

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Map className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-white">Patrol Oversight</h1>
            <p className="text-xs text-gray-500">Live officer tracking · Shift management</p>
          </div>
        </div>
        <button onClick={loadData}
          className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white bg-[#111827] border border-[#1F2D42] px-3 py-2 rounded-xl transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Officers', value: stats.total, color: 'text-white', icon: Users, iconColor: 'text-gray-500' },
          { label: 'On Duty', value: stats.active, color: 'text-green-400', icon: Shield, iconColor: 'text-green-500' },
          { label: 'On Patrol', value: stats.onPatrol, color: 'text-blue-400', icon: Radio, iconColor: 'text-blue-500' },
          { label: 'GPS Active', value: stats.withGPS, color: 'text-cyan-400', icon: Navigation, iconColor: 'text-cyan-500' },
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
        {(['map', 'logs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${
              tab === t ? 'bg-[#0B0F1A] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'map' ? '🗺️ Officers Map' : '📋 Patrol Logs'}
          </button>
        ))}
      </div>

      {tab === 'map' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Officers List */}
          <div className="xl:col-span-1 bg-[#111827] border border-[#1F2D42] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1F2D42]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search officers..."
                  className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-gray-600 outline-none focus:border-green-500/40"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[500px] custom-scrollbar divide-y divide-[#1F2D42]/30">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                </div>
              ) : filteredOfficers.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">No officers found</div>
              ) : (
                filteredOfficers.map(o => {
                  const status = STATUS_COLORS[o.op_status] || STATUS_COLORS[o.duty_status] || STATUS_COLORS.OFF_DUTY
                  const isSelected = selectedOfficer === o.id
                  return (
                    <button key={o.id} onClick={() => setSelectedOfficer(isSelected ? null : o.id)}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-green-500/5' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-lg bg-[#0D1420] border border-[#1F2D42] flex items-center justify-center text-xs font-bold text-blue-300">
                            {o.full_name.charAt(0)}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#111827] ${status.dot}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] text-white font-medium truncate">{o.full_name}</p>
                          <p className="text-[10px] text-gray-500">{o.rank} · {o.badge_number || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                        {o.device_battery_pct !== null && o.device_battery_pct < 20 && (
                          <Battery className="w-3 h-3 text-red-400" />
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Map Area / Officer Detail */}
          <div className="xl:col-span-2 bg-[#111827] border border-[#1F2D42] rounded-2xl overflow-hidden min-h-[500px]">
            {selectedOfficer && selected ? (
              <div className="p-6 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/20 flex items-center justify-center text-lg font-bold text-green-400">
                    {selected.full_name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-heading font-bold text-white">{selected.full_name}</h2>
                    <p className="text-xs text-gray-400">{selected.rank} · Badge: {selected.badge_number || '—'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {(() => {
                        const status = STATUS_COLORS[selected.op_status] || STATUS_COLORS[selected.duty_status] || STATUS_COLORS.OFF_DUTY
                        return (
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <InfoCard label="GPS Status" value={selected.current_lat ? 'Active' : 'No Signal'} icon={Navigation}
                    color={selected.current_lat ? 'text-green-400' : 'text-red-400'} />
                  <InfoCard label="Last Update" value={timeAgo(selected.last_gps_update)} icon={Clock} color="text-gray-300" />
                  <InfoCard label="Battery" value={selected.device_battery_pct !== null ? `${selected.device_battery_pct}%` : '—'} icon={Battery}
                    color={selected.device_battery_pct !== null && selected.device_battery_pct < 20 ? 'text-red-400' : 'text-gray-300'} />
                  <InfoCard label="Shift" value={selected.shift_status || 'Not assigned'} icon={Radio} color="text-gray-300" />
                </div>

                {selected.current_lat && selected.current_lon && (
                  <a href={`https://www.google.com/maps?q=${selected.current_lat},${selected.current_lon}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl p-4 hover:bg-green-500/20 transition-colors"
                  >
                    <MapPin className="w-5 h-5" />
                    View Current Location on Map
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </a>
                )}

                <div className="bg-[#0D1420] rounded-xl p-4">
                  <h4 className="text-[10px] text-gray-600 uppercase tracking-wider mb-3 font-semibold">Location Coordinates</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-gray-600">Latitude</p>
                      <p className="text-sm text-white font-mono">{selected.current_lat?.toFixed(6) || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600">Longitude</p>
                      <p className="text-sm text-white font-mono">{selected.current_lon?.toFixed(6) || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center">
                <Map className="w-16 h-16 text-gray-700 mb-4" />
                <p className="text-sm text-gray-400">Select an officer to view details</p>
                <p className="text-[11px] text-gray-600 mt-1">Click any officer from the list</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Patrol Logs Tab */
        <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#1F2D42] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-400" /> Recent Patrol Logs
            </h3>
            <span className="text-[10px] text-gray-500">{patrolLogs.length} records</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
            </div>
          ) : patrolLogs.length === 0 ? (
            <div className="py-16 text-center">
              <Radio className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No patrol logs yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1F2D42]/30">
              {patrolLogs.map(log => (
                <div key={log.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Radio className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">
                          {(log as any).profiles?.full_name || 'Unknown Officer'}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(log.started_at).toLocaleString('en-IN')}</span>
                          {log.ended_at && (
                            <>
                              <span>→</span>
                              <span>{new Date(log.ended_at).toLocaleTimeString('en-IN')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                      log.ended_at ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    }`}>
                      {log.ended_at ? 'Completed' : 'Active'}
                    </span>
                  </div>
                  {log.notes && (
                    <p className="text-xs text-gray-400 mt-2 ml-12">{log.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InfoCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="bg-[#0D1420] rounded-xl p-3 border border-[#1F2D42]/50">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-gray-600" />
        <p className="text-[9px] text-gray-600 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-sm font-medium ${color}`}>{value}</p>
    </div>
  )
}
