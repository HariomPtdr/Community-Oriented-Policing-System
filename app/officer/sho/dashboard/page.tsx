'use client'
import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  Shield, AlertTriangle, FileText, Siren, Eye, CheckCircle2,
  Clock, TrendingUp, Users, Radio, Activity, ChevronRight,
  ArrowUpRight, Loader2, Bell, MapPin
} from 'lucide-react'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useSHOMetrics } from '@/lib/hooks/sho/useSHOMetrics'
import { useSHORealtime } from '@/lib/hooks/sho/useSHORealtime'
import { loadRecentActivity, loadStationOfficers } from '@/lib/api/sho'

type LiveEvent = {
  msg: string
  time: string
  isUrgent: boolean
  type: 'complaint' | 'fir' | 'sos' | 'integrity' | 'patrol' | 'closure' | 'concern'
}

const METRIC_CARDS = [
  { key: 'pending_complaints', label: 'Pending Complaints', icon: FileText, color: 'from-blue-500/20 to-blue-600/5', iconColor: 'text-blue-400', borderColor: 'border-blue-500/30', href: '/officer/sho/complaints' },
  { key: 'active_firs', label: 'Active FIRs', icon: Eye, color: 'from-amber-500/20 to-amber-600/5', iconColor: 'text-amber-400', borderColor: 'border-amber-500/30', href: '/officer/sho/cases' },
  { key: 'active_sos', label: 'Active SOS', icon: Siren, color: 'from-red-500/20 to-red-600/5', iconColor: 'text-red-400', borderColor: 'border-red-500/30', href: '/officer/sho/sos' },
  { key: 'integrity_flags', label: 'Integrity Flags', icon: AlertTriangle, color: 'from-orange-500/20 to-orange-600/5', iconColor: 'text-orange-400', borderColor: 'border-orange-500/30', href: '/officer/sho/integrity' },
  { key: 'cases_closed_month', label: 'Closed This Month', icon: CheckCircle2, color: 'from-green-500/20 to-green-600/5', iconColor: 'text-green-400', borderColor: 'border-green-500/30', href: '/officer/sho/cases' },
  { key: 'closure_pending', label: 'Closure Pending', icon: Clock, color: 'from-indigo-500/20 to-indigo-600/5', iconColor: 'text-indigo-400', borderColor: 'border-indigo-500/30', href: '/officer/sho/cases' },
]

const MODULE_LINKS = [
  { href: '/officer/sho/complaints', label: 'M1 — Complaints Queue', desc: 'Review & process citizen complaints', icon: '📝', gradient: 'from-blue-500/10 to-blue-600/5', border: 'hover:border-blue-500/40' },
  { href: '/officer/sho/cases', label: 'M2 — FIR Management', desc: 'Track active investigations', icon: '📋', gradient: 'from-amber-500/10 to-amber-600/5', border: 'hover:border-amber-500/40' },
  { href: '/officer/sho/patrol', label: 'M3 — Patrol Oversight', desc: 'Live map & shift management', icon: '🚓', gradient: 'from-green-500/10 to-green-600/5', border: 'hover:border-green-500/40' },
  { href: '/officer/sho/transparency', label: 'M4 — Transparency', desc: 'Publish reports to citizens', icon: '📊', gradient: 'from-indigo-500/10 to-indigo-600/5', border: 'hover:border-indigo-500/40' },
  { href: '/officer/sho/sos', label: 'M5 — SOS Command', desc: 'Emergency response center', icon: '🚨', gradient: 'from-red-500/10 to-red-600/5', border: 'hover:border-red-500/40' },
  { href: '/officer/sho/integrity', label: 'M6 — Integrity', desc: 'Verification & compliance', icon: '🛡️', gradient: 'from-orange-500/10 to-orange-600/5', border: 'hover:border-orange-500/40' },
]

const EVENT_TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  complaint: { icon: '📝', color: 'text-blue-400' },
  fir: { icon: '📋', color: 'text-amber-400' },
  sos: { icon: '🚨', color: 'text-red-400' },
  integrity: { icon: '🛡️', color: 'text-orange-400' },
  patrol: { icon: '🚓', color: 'text-green-400' },
  closure: { icon: '📋', color: 'text-indigo-400' },
  concern: { icon: '⚠️', color: 'text-yellow-400' },
}

export default function SHODashboard() {
  const { user, loading: userLoading } = useCurrentUser()
  const { metrics, loading: metricsLoading } = useSHOMetrics(user?.stationId)
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([])
  const [officers, setOfficers] = useState<any[]>([])
  const [officersLoading, setOfficersLoading] = useState(true)

  const addEvent = useCallback((msg: string, type: LiveEvent['type'], isUrgent = false) => {
    setLiveEvents(prev => [{
      msg, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      isUrgent, type
    }, ...prev].slice(0, 15))
  }, [])

  // Realtime subscriptions for live feed
  useSHORealtime(user?.stationId, user?.id, {
    onNewComplaint: (comp: any) => addEvent(
      `New Complaint: ${comp.category?.replace(/_/g, ' ')} — ${comp.complainant_name || 'Anonymous'}`,
      'complaint'
    ),
    onFIRUpdate: (fir: any) => addEvent(
      `FIR ${fir.fir_number || fir.id?.slice(0, 8)} updated → ${fir.case_status?.replace(/_/g, ' ')}`,
      'fir'
    ),
    onSOSUpdate: (sos: any, _: any, eventType?: string) => addEvent(
      `🚨 SOS Alert ${eventType === 'INSERT' ? 'TRIGGERED' : sos.status?.replace(/_/g, ' ')} — ${sos.emergency_type}`,
      'sos', true
    ),
    onIntegrityViolation: (vio: any) => addEvent(
      `Integrity flag: ${vio.violation_type?.replace(/_/g, ' ')} — ${vio.severity}`,
      'integrity', vio.severity === 'CRITICAL'
    ),
    onPatrolAnomaly: (a: any) => addEvent(
      `Patrol anomaly: ${a.anomaly_type?.replace(/_/g, ' ')}`,
      'patrol'
    ),
    onClosureRequest: () => addEvent('New closure request submitted', 'closure'),
    onCitizenConcern: () => addEvent('Citizen raised a concern', 'concern', true),
  })

  // Load officers on duty
  useEffect(() => {
    if (!user?.stationId) return
    const fetchOfficers = async () => {
      const { data } = await loadStationOfficers(user.stationId!)
      setOfficers(data || [])
      setOfficersLoading(false)
    }
    fetchOfficers()
  }, [user?.stationId])

  // Load initial activity feed
  useEffect(() => {
    if (!user?.stationId) return
    loadRecentActivity(user.stationId).then(events => {
      setLiveEvents(events.map(e => ({
        msg: e.title,
        time: new Date(e.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        isUrgent: e.isUrgent,
        type: e.type
      })))
    }).catch(() => {})
  }, [user?.stationId])

  const activeOfficers = officers.filter(o => o.duty_status === 'ACTIVE')
  const onPatrol = officers.filter(o => o.shift_status === 'ACTIVE' || o.op_status === 'EN_ROUTE')

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-white">
                SHO Command Center
              </h1>
              <p className="text-gray-500 text-xs">
                {user?.fullName || 'SHO'} · Vijay Nagar PS · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-green-500/8 border border-green-500/15 px-3 py-1.5 rounded-xl">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-60" />
            </div>
            <span className="text-[11px] text-green-400 font-semibold">Station Online</span>
          </div>
          <div className="text-[11px] text-gray-500 bg-[#111827] border border-[#1F2D42] px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            {activeOfficers.length} Active · {onPatrol.length} On Patrol
          </div>
        </div>
      </div>

      {/* 6 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {metricsLoading ? (
          <div className="col-span-full flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="text-sm text-gray-500 ml-2">Loading station metrics...</span>
          </div>
        ) : (
          METRIC_CARDS.map(card => {
            const Icon = card.icon
            const value = metrics?.[card.key] || 0
            const isAlert = card.key === 'active_sos' && value > 0
            return (
              <Link key={card.key} href={card.href}
                className={`group relative bg-gradient-to-br ${card.color} border ${card.borderColor} rounded-2xl p-4 transition-all hover:scale-[1.02] hover:shadow-lg ${isAlert ? 'animate-pulse ring-1 ring-red-500/30' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl bg-[#0B0F1A]/60 flex items-center justify-center`}>
                    <Icon className={`w-4.5 h-4.5 ${card.iconColor}`} />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-white transition-colors" />
                </div>
                <p className="text-2xl font-heading font-bold text-white mb-0.5">{value}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{card.label}</p>
              </Link>
            )
          })
        )}
      </div>

      {/* Live Feed + Officers */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Live Activity Feed */}
        <div className="xl:col-span-2 bg-[#111827] border border-[#1F2D42] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1F2D42]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              Station Live Feed
            </h3>
            <span className="text-[10px] text-gray-600">{liveEvents.length} events</span>
          </div>
          <div className="overflow-y-auto max-h-[320px] custom-scrollbar">
            {liveEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="w-8 h-8 text-gray-700 mb-3" />
                <p className="text-sm text-gray-500">Monitoring station activity...</p>
                <p className="text-[11px] text-gray-600 mt-1">Events will appear here in real-time</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1F2D42]/40">
                {liveEvents.map((evt, idx) => {
                  const config = EVENT_TYPE_CONFIG[evt.type] || EVENT_TYPE_CONFIG.complaint
                  return (
                    <div key={idx}
                      className={`px-5 py-3 flex items-center justify-between gap-3 transition-colors ${
                        evt.isUrgent
                          ? 'bg-red-500/5 border-l-2 border-red-500'
                          : 'hover:bg-white/[0.02] border-l-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base flex-shrink-0">{config.icon}</span>
                        <p className={`text-[13px] truncate ${evt.isUrgent ? 'text-white font-medium' : 'text-gray-300'}`}>
                          {evt.msg}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-600 flex-shrink-0 font-mono">{evt.time}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Officers On Duty */}
        <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1F2D42]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Officers Status
            </h3>
            <Link href="/officer/sho/officers" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-y-auto max-h-[320px] custom-scrollbar divide-y divide-[#1F2D42]/30">
            {officersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
              </div>
            ) : officers.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-500">No officers found</div>
            ) : (
              officers.slice(0, 8).map((o, i) => {
                const statusConfig: Record<string, { color: string; label: string }> = {
                  ACTIVE: { color: 'text-green-400 bg-green-500/10 border-green-500/20', label: 'Active' },
                  AVAILABLE: { color: 'text-green-400 bg-green-500/10 border-green-500/20', label: 'Available' },
                  BUSY: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Busy' },
                  EN_ROUTE: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'En Route' },
                  ON_SCENE: { color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', label: 'On Scene' },
                  OFF_DUTY: { color: 'text-gray-500 bg-gray-500/10 border-gray-500/20', label: 'Off Duty' },
                  ON_LEAVE: { color: 'text-gray-500 bg-gray-500/10 border-gray-500/20', label: 'On Leave' },
                }
                const status = statusConfig[o.op_status] || statusConfig[o.duty_status] || statusConfig.OFF_DUTY
                return (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#0D1420] border border-[#1F2D42] flex items-center justify-center text-xs font-bold text-blue-300 flex-shrink-0">
                        {(o.full_name || '?').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] text-white truncate">{o.full_name || 'Unknown'}</p>
                        <p className="text-[10px] text-gray-500">{o.rank} · {o.badge_number || '—'}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-md border flex-shrink-0 ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Module Links Grid */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Station Management Modules</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {MODULE_LINKS.map(m => (
            <Link key={m.href} href={m.href}
              className={`group bg-gradient-to-br ${m.gradient} border border-[#1F2D42] ${m.border} rounded-2xl p-4 flex flex-col items-center text-center gap-2.5 transition-all hover:scale-[1.02] hover:shadow-lg`}
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{m.icon}</span>
              <div>
                <p className="text-xs text-white font-semibold">{m.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 hidden md:block">{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/officer/sho/complaints', label: 'Process Next Complaint', icon: '📝', desc: 'FIFO queue' },
          { href: '/officer/sho/sos', label: 'SOS Monitor', icon: '🚨', desc: 'Live alerts' },
          { href: '/officer/sho/patrol', label: 'Live Patrol Map', icon: '🗺️', desc: 'GPS tracking' },
          { href: '/officer/sho/integrity', label: 'Review Violations', icon: '🔍', desc: 'Pending flags' },
        ].map(action => (
          <Link key={action.href} href={action.href}
            className="group bg-[#111827] border border-[#1F2D42] hover:border-orange-500/30 rounded-xl p-4 flex items-center gap-3 transition-all"
          >
            <span className="text-xl">{action.icon}</span>
            <div>
              <p className="text-[13px] text-white font-medium group-hover:text-orange-400 transition-colors">{action.label}</p>
              <p className="text-[10px] text-gray-500">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
