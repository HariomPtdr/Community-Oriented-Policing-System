'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useSHORealtime } from '@/lib/hooks/sho/useSHORealtime'
import {
  Shield, AlertTriangle, Eye, Users, Clock, MapPin,
  ChevronRight, ChevronDown, Loader2, RefreshCw, Check,
  X, Flag, ArrowUpRight, Briefcase, Search, Filter,
  Activity, Scale, TrendingUp, AlertCircle
} from 'lucide-react'

const VIOLATION_TYPES: Record<string, { icon: string; label: string; color: string }> = {
  PROXIMITY_FAIL: { icon: '📍', label: 'Proximity Fail', color: 'text-red-400' },
  TIME_INSUFFICIENT: { icon: '⏱️', label: 'Time Insufficient', color: 'text-orange-400' },
  GPS_ANOMALY: { icon: '🛰️', label: 'GPS Anomaly', color: 'text-yellow-400' },
  ROUTE_DEVIATION: { icon: '🗺️', label: 'Route Deviation', color: 'text-amber-400' },
  DUTY_ABSENCE: { icon: '👤', label: 'Duty Absence', color: 'text-red-400' },
  REPORT_DELAY: { icon: '📋', label: 'Report Delay', color: 'text-blue-400' },
  EVIDENCE_TAMPER: { icon: '🔍', label: 'Evidence Concern', color: 'text-red-400' },
  OTHER: { icon: '⚠️', label: 'Other', color: 'text-gray-400' },
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' },
  HIGH: { color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' },
  MEDIUM: { color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' },
  LOW: { color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' },
}

const ACTION_CONFIG: Record<string, { color: string; label: string }> = {
  PENDING_REVIEW: { color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', label: 'Pending Review' },
  OVERRIDE_ACCEPTABLE: { color: 'text-green-400 bg-green-500/10 border-green-500/20', label: 'Override OK' },
  FLAGGED_FOR_REVIEW: { color: 'text-red-400 bg-red-500/10 border-red-500/20', label: 'Flagged' },
  DISMISSED_FALSE_POSITIVE: { color: 'text-gray-400 bg-gray-500/10 border-gray-500/20', label: 'Dismissed' },
  ESCALATED: { color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', label: 'Escalated' },
}

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function IntegrityPage() {
  const { user } = useCurrentUser()
  const supabase = createClient()

  const [violations, setViolations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterAction, setFilterAction] = useState('all')
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [actionNote, setActionNote] = useState('')

  const loadData = useCallback(async () => {
    if (!user?.stationId) return

    // Try integrity_violations table first
    const { data: intViolations, error } = await supabase
      .from('integrity_violations')
      .select(`
        *,
        officer_profiles!officer_id(id, badge_number, rank),
        profiles!officer_id(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && intViolations && intViolations.length > 0) {
      setViolations(intViolations.map(v => ({
        ...v,
        officer_name: (v as any).profiles?.full_name || 'Unknown',
        officer_rank: (v as any).officer_profiles?.rank || '—',
        officer_badge: (v as any).officer_profiles?.badge_number || '—',
      })))
    } else {
      // If no integrity_violations table, show empty state
      setViolations([])
    }

    setLoading(false)
  }, [user?.stationId])

  useEffect(() => { loadData() }, [loadData])

  // Realtime
  useSHORealtime(user?.stationId, user?.id, {
    onIntegrityViolation: () => loadData(),
  })

  const filtered = violations.filter(v => {
    const matchAction = filterAction === 'all' || v.sho_action === filterAction
    const matchSeverity = filterSeverity === 'all' || v.severity === filterSeverity
    const matchSearch = !searchQuery ||
      v.officer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.officer_badge?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchAction && matchSeverity && matchSearch
  })

  const stats = {
    total: violations.length,
    pending: violations.filter(v => v.sho_action === 'PENDING_REVIEW' || !v.sho_action).length,
    critical: violations.filter(v => v.severity === 'CRITICAL').length,
    flagged: violations.filter(v => v.sho_action === 'FLAGGED_FOR_REVIEW').length,
  }

  const handleAction = async (violationId: string, action: string) => {
    setProcessing(violationId)
    await supabase.from('integrity_violations').update({
      sho_action: action,
      sho_action_by: user?.id,
      sho_action_note: actionNote || null,
      sho_action_at: new Date().toISOString(),
    }).eq('id', violationId)

    setProcessing(null)
    setActionNote('')
    setExpandedId(null)
    loadData()
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-white">Integrity Dashboard</h1>
            <p className="text-xs text-gray-500">Verification compliance · Officer accountability</p>
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
          { label: 'Total Violations', value: stats.total, color: 'text-white', icon: AlertTriangle, iconColor: 'text-gray-500' },
          { label: 'Pending Review', value: stats.pending, color: stats.pending > 0 ? 'text-orange-400' : 'text-gray-400', icon: Clock, iconColor: 'text-orange-500' },
          { label: 'Critical', value: stats.critical, color: stats.critical > 0 ? 'text-red-400' : 'text-gray-400', icon: AlertCircle, iconColor: 'text-red-500' },
          { label: 'Flagged', value: stats.flagged, color: 'text-red-400', icon: Flag, iconColor: 'text-red-500' },
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

      {/* Search + Filter */}
      <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by officer name or badge..."
              className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-gray-600 outline-none focus:border-orange-500/40"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-all ${
              showFilters || filterAction !== 'all' || filterSeverity !== 'all'
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                : 'bg-[#0D1420] border-[#1F2D42] text-gray-400 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
        </div>
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-[#1F2D42] grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5 font-semibold">Action Status</p>
              <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
                className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-lg px-2 py-1.5 text-[11px] text-white outline-none"
              >
                <option value="all">All</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="OVERRIDE_ACCEPTABLE">Override OK</option>
                <option value="FLAGGED_FOR_REVIEW">Flagged</option>
                <option value="DISMISSED_FALSE_POSITIVE">Dismissed</option>
              </select>
            </div>
            <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5 font-semibold">Severity</p>
              <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
                className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-lg px-2 py-1.5 text-[11px] text-white outline-none"
              >
                <option value="all">All</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Violations List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl py-16 text-center">
          <Shield className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-white font-medium">
            {violations.length === 0 ? 'No integrity violations recorded' : 'No violations match your filters'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {violations.length === 0 ? 'All officers are in good standing' : 'Try adjusting your search or filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(v => {
            const vType = VIOLATION_TYPES[v.violation_type] || VIOLATION_TYPES.OTHER
            const severity = SEVERITY_CONFIG[v.severity] || SEVERITY_CONFIG.MEDIUM
            const action = ACTION_CONFIG[v.sho_action || 'PENDING_REVIEW'] || ACTION_CONFIG.PENDING_REVIEW
            const isExpanded = expandedId === v.id

            return (
              <div key={v.id} className={`bg-[#111827] border rounded-2xl transition-all ${
                isExpanded ? 'border-orange-500/30 shadow-lg shadow-orange-500/5' : 'border-[#1F2D42] hover:border-[#2A3A52]'
              }`}>
                <button onClick={() => setExpandedId(isExpanded ? null : v.id)}
                  className="w-full text-left p-4 flex items-center gap-4"
                >
                  <span className="text-xl flex-shrink-0">{vType.icon}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${severity.bg} ${severity.color}`}>
                        {v.severity}
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${action.color}`}>
                        {action.label}
                      </span>
                    </div>
                    <p className="text-sm text-white font-medium">{v.officer_name} ({v.officer_rank})</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{vType.label} · {timeAgo(v.created_at)} · Badge: {v.officer_badge}</p>
                  </div>

                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="border-t border-[#1F2D42] p-5 space-y-4">
                    {/* Violation Details */}
                    {v.description && (
                      <div className="bg-[#0D1420] rounded-xl p-4">
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 font-semibold">Description</p>
                        <p className="text-xs text-gray-300">{v.description}</p>
                      </div>
                    )}

                    {/* GPS Data if available */}
                    {(v.officer_lat || v.required_lat) && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {v.distance_meters && (
                          <div>
                            <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Distance</p>
                            <p className="text-xs text-red-400 font-mono">{v.distance_meters}m</p>
                          </div>
                        )}
                        {v.proximity_threshold_m && (
                          <div>
                            <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Threshold</p>
                            <p className="text-xs text-gray-300 font-mono">{v.proximity_threshold_m}m</p>
                          </div>
                        )}
                        {v.time_spent_seconds !== undefined && (
                          <div>
                            <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Time Spent</p>
                            <p className="text-xs text-gray-300">{Math.round(v.time_spent_seconds / 60)}m</p>
                          </div>
                        )}
                        {v.min_time_required_sec !== undefined && (
                          <div>
                            <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Required</p>
                            <p className="text-xs text-gray-300">{Math.round(v.min_time_required_sec / 60)}m</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SHO Action */}
                    {(!v.sho_action || v.sho_action === 'PENDING_REVIEW') && (
                      <div className="space-y-3 bg-[#0D1420] rounded-xl p-4 border border-orange-500/10">
                        <h5 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Take Action</h5>
                        <textarea value={actionNote} onChange={e => setActionNote(e.target.value)}
                          placeholder="Add a note (optional)..."
                          rows={2}
                          className="w-full bg-[#111827] border border-[#1F2D42] rounded-lg px-3 py-2 text-xs text-white outline-none resize-none placeholder:text-gray-700"
                        />
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => handleAction(v.id, 'OVERRIDE_ACCEPTABLE')}
                            disabled={processing === v.id}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                          >
                            <Check className="w-3 h-3" /> Override OK
                          </button>
                          <button onClick={() => handleAction(v.id, 'FLAGGED_FOR_REVIEW')}
                            disabled={processing === v.id}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            <Flag className="w-3 h-3" /> Flag for Review
                          </button>
                          <button onClick={() => handleAction(v.id, 'DISMISSED_FALSE_POSITIVE')}
                            disabled={processing === v.id}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 bg-gray-500/10 border border-gray-500/20 rounded-lg px-3 py-2 hover:bg-gray-500/20 transition-colors disabled:opacity-50"
                          >
                            <X className="w-3 h-3" /> Dismiss
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Previous action */}
                    {v.sho_action && v.sho_action !== 'PENDING_REVIEW' && (
                      <div className="bg-[#0D1420] rounded-xl p-4">
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 font-semibold">SHO Decision</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded border ${action.color}`}>
                            {action.label}
                          </span>
                          {v.sho_action_at && (
                            <span className="text-[10px] text-gray-600">{timeAgo(v.sho_action_at)}</span>
                          )}
                        </div>
                        {v.sho_action_note && (
                          <p className="text-xs text-gray-400 mt-2">{v.sho_action_note}</p>
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
    </div>
  )
}
