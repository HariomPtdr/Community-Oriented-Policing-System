'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Filter, FileText, ChevronDown, ChevronRight, Eye, Shield, UserCircle,
  CheckCircle, Loader2, Clock, AlertTriangle, Hash, Calendar, MapPin,
  Ban, Check, X, Save, Send, Pencil, ArrowUpDown, ClipboardList
} from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Submitted', color: 'text-orange-400', bg: 'bg-orange-500/15' },
  { value: 'under_review', label: 'Under Review', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  { value: 'assigned', label: 'Assigned', color: 'text-purple-400', bg: 'bg-purple-500/15' },
  { value: 'in_progress', label: 'In Progress', color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  { value: 'evidence_collection', label: 'Evidence Collection', color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
  { value: 'accused_identified', label: 'Accused Identified', color: 'text-amber-400', bg: 'bg-amber-500/15' },
  { value: 'accused_arrested', label: 'Accused Arrested', color: 'text-red-400', bg: 'bg-red-500/15' },
  { value: 'charge_sheet_filed', label: 'Charge Sheet Filed', color: 'text-indigo-400', bg: 'bg-indigo-500/15' },
  { value: 'resolved', label: 'Resolved', color: 'text-green-400', bg: 'bg-green-500/15' },
  { value: 'closed', label: 'Closed', color: 'text-gray-400', bg: 'bg-gray-500/15' },
  { value: 'rejected', label: 'Rejected', color: 'text-red-400', bg: 'bg-red-500/15' },
]

type FIR = {
  id: string; title: string; description: string; detailed_description: string | null
  category: string; status: string; priority: string; fir_number: string | null
  complaint_type: string | null; created_at: string; updated_at: string
  reporter_id: string; assigned_officer_id: string | null; station_id: string | null
  c_full_name: string | null; c_mobile: string | null; c_father_name: string | null
  c_address: string | null; i_district: string | null; i_police_station: string | null
  location_description: string | null; rejection_reason: string | null
  verified_at: string | null; verified_by: string | null
}

export default function PoliceFIRDashboard() {
  const supabase = createClient()
  const [firs, setFirs] = useState<FIR[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [officerProfile, setOfficerProfile] = useState<any>(null)
  const [officers, setOfficers] = useState<any[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<Record<string, any>>({})
  const [statusUpdateRequests, setStatusUpdateRequests] = useState<Record<string, any[]>>({})
  const [pendingRequestCount, setPendingRequestCount] = useState(0)

  const loadFIRs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const { data: op } = await supabase.from('officer_profiles').select('*').eq('id', user.id).single()
    setOfficerProfile({ ...profile, ...op, id: user.id })

    // Load all incidents (officers can see all)
    let query = supabase.from('incidents').select('*').neq('status', 'draft').order('created_at', { ascending: false })
    const { data } = await query
    setFirs((data as FIR[]) || [])

    // Load station officers for assignment
    if (op?.station_id) {
      const { data: stationOfficers } = await supabase
        .from('officer_profiles').select('id, badge_number, rank')
        .eq('station_id', op.station_id)
      if (stationOfficers) {
        const enriched = await Promise.all(stationOfficers.map(async (o: any) => {
          const { data: p } = await supabase.from('profiles').select('full_name').eq('id', o.id).single()
          return { ...o, full_name: p?.full_name || 'Unknown' }
        }))
        setOfficers(enriched)
      }
    }

    // Load pending status update requests count
    const { data: requests } = await supabase
      .from('status_update_requests').select('*').eq('is_acknowledged', false)
    setPendingRequestCount(requests?.length || 0)

    setLoading(false)
  }, [])

  useEffect(() => { loadFIRs() }, [loadFIRs])

  // Realtime
  useEffect(() => {
    const channel = supabase.channel('police_fir_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => loadFIRs())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'status_update_requests' }, () => loadFIRs())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadFIRs])

  const loadStatusRequests = async (incidentId: string) => {
    const { data } = await supabase
      .from('status_update_requests').select('*').eq('incident_id', incidentId).order('requested_at', { ascending: false })
    setStatusUpdateRequests(prev => ({ ...prev, [incidentId]: data || [] }))
  }

  const toggleExpand = (fir: FIR) => {
    if (expandedId === fir.id) { setExpandedId(null) } else {
      setExpandedId(fir.id)
      setEditState(prev => ({ ...prev, [fir.id]: { status: fir.status, fir_number: fir.fir_number || '', assigned_officer_id: fir.assigned_officer_id || '', rejection_reason: fir.rejection_reason || '', note: '' } }))
      loadStatusRequests(fir.id)
    }
  }

  // ── Core actions ──
  const handleVerifyAndUpdate = async (fir: FIR) => {
    const edit = editState[fir.id]
    if (!edit) return
    setUpdatingId(fir.id)

    const updates: any = {}
    if (edit.status !== fir.status) updates.status = edit.status
    if (edit.fir_number && edit.fir_number !== fir.fir_number) updates.fir_number = edit.fir_number
    if (edit.assigned_officer_id && edit.assigned_officer_id !== fir.assigned_officer_id) updates.assigned_officer_id = edit.assigned_officer_id
    if (edit.status === 'rejected' && edit.rejection_reason) updates.rejection_reason = edit.rejection_reason
    if (edit.status === 'under_review' && !fir.verified_at) {
      updates.verified_at = new Date().toISOString()
      updates.verified_by = officerProfile?.id
    }
    if (edit.status === 'resolved') updates.resolved_at = new Date().toISOString()

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('incidents').update(updates).eq('id', fir.id)
      if (error) { alert('Update failed: ' + error.message); setUpdatingId(null); return }

      // Insert status history
      if (updates.status) {
        await supabase.from('incident_status_history').insert({
          incident_id: fir.id, changed_by: officerProfile?.id,
          old_status: fir.status, new_status: updates.status, note: edit.note || null
        })
      }

      // Post case update if note provided
      if (edit.note) {
        await supabase.from('case_updates').insert({
          incident_id: fir.id, posted_by: officerProfile?.id,
          content: edit.note, is_public: true, update_type: 'progress'
        })
      }

      // Notify citizen
      await supabase.from('notifications').insert({
        user_id: fir.reporter_id, title: 'Case Updated',
        body: `Your case ${fir.fir_number || fir.id.slice(0, 8)} has been updated to: ${updates.status || fir.status}`,
        type: 'incident_update', reference_id: fir.id
      })
    }

    setUpdatingId(null)
    loadFIRs()
  }

  const handleAcknowledgeRequest = async (requestId: string, response: string) => {
    await supabase.from('status_update_requests').update({
      is_acknowledged: true, acknowledged_by: officerProfile?.id,
      acknowledged_at: new Date().toISOString(), response: response || 'Acknowledged'
    }).eq('id', requestId)
    loadFIRs()
  }

  const generateFIRNumber = () => {
    const prefix = 'MP/IND-CN'
    const num = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
    const year = new Date().getFullYear()
    return `${prefix}/${num}/${year}`
  }

  // Filtering
  const filtered = firs.filter(r => {
    const matchSearch = !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) || (r.fir_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.c_full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    return matchSearch && matchStatus
  })

  const stats = {
    total: firs.length,
    pending: firs.filter(r => r.status === 'submitted').length,
    active: firs.filter(r => !['resolved','closed','rejected','submitted','draft'].includes(r.status)).length,
    resolved: firs.filter(r => ['resolved','closed'].includes(r.status)).length,
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#111827] via-[#131D2E] to-[#111827] border border-[#1F2D42] rounded-2xl p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              FIR Management Dashboard
            </h1>
            <p className="text-sm text-gray-400 mt-1.5 ml-[46px]">Review, verify, assign, and manage all incident reports</p>
          </div>
          {pendingRequestCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-400 font-medium">{pendingRequestCount} pending update request{pendingRequestCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Total FIRs', value: stats.total, color: 'text-white', icon: FileText, iconColor: 'text-gray-500' },
            { label: 'Pending Review', value: stats.pending, color: 'text-orange-400', icon: Clock, iconColor: 'text-orange-500' },
            { label: 'Active Cases', value: stats.active, color: 'text-blue-400', icon: Eye, iconColor: 'text-blue-500' },
            { label: 'Resolved', value: stats.resolved, color: 'text-green-400', icon: CheckCircle, iconColor: 'text-green-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#0D1420]/60 border border-[#1F2D42]/50 rounded-xl p-3 flex items-center gap-3">
              <stat.icon className={`w-4 h-4 ${stat.iconColor} flex-shrink-0`} />
              <div>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by title, FIR number, complainant..."
              className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-blue-500/40 transition-colors" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border transition-all ${showFilters || filterStatus !== 'all' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-[#0D1420] border-[#1F2D42] text-gray-400 hover:text-white'}`}>
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-[#1F2D42]">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {['all', ...STATUS_OPTIONS.map(s => s.value)].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`text-[11px] px-2.5 py-1 rounded-lg transition-all font-medium ${filterStatus === s ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-[#0D1420] text-gray-400 border border-[#1F2D42] hover:text-white'}`}>
                  {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FIR List */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl py-16 text-center">
          <FileText className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-medium">No FIRs found</p>
          <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(fir => {
            const isExpanded = expandedId === fir.id
            const sc = STATUS_OPTIONS.find(s => s.value === fir.status) || STATUS_OPTIONS[0]
            const edit = editState[fir.id] || {}
            const requests = statusUpdateRequests[fir.id] || []

            return (
              <div key={fir.id} className={`bg-[#111827] border rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-blue-500/30 shadow-lg shadow-blue-500/5' : 'border-[#1F2D42] hover:border-[#2A3A52]'}`}>
                {/* Row */}
                <button onClick={() => toggleExpand(fir)} className="w-full text-left p-5 flex items-center gap-4 group">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${fir.status === 'submitted' ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-[#0D1420] border border-[#1F2D42]'}`}>
                    {fir.status === 'submitted' ? '🆕' : fir.status === 'rejected' ? '❌' : '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {fir.fir_number && <span className="text-[11px] font-mono text-blue-400">{fir.fir_number}</span>}
                      <span className="text-[11px] font-mono text-gray-600">{fir.id.slice(0, 8)}...</span>
                    </div>
                    <p className="text-sm text-white font-medium truncate">{fir.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(fir.created_at)}</span>
                      {fir.c_full_name && <span className="text-[11px] text-gray-500 flex items-center gap-1"><UserCircle className="w-3 h-3" /> {fir.c_full_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${sc.color} ${sc.bg} uppercase tracking-wider hidden sm:inline`}>{sc.label}</span>
                    {fir.status === 'submitted' && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Expanded Panel */}
                {isExpanded && (
                  <div className="border-t border-[#1F2D42] p-5 space-y-5">
                    {/* Complainant Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <InfoCell label="Complainant" value={fir.c_full_name || 'N/A'} />
                      <InfoCell label="Mobile" value={fir.c_mobile || 'N/A'} />
                      <InfoCell label="Father" value={fir.c_father_name || 'N/A'} />
                      <InfoCell label="Address" value={fir.c_address || fir.location_description || 'N/A'} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <InfoCell label="District" value={fir.i_district || 'N/A'} />
                      <InfoCell label="Police Station" value={fir.i_police_station || 'N/A'} />
                      <InfoCell label="Category" value={fir.category?.replace(/_/g, ' ')} />
                      <InfoCell label="Type" value={fir.complaint_type?.replace(/_/g, ' ') || 'General'} />
                    </div>

                    {/* Description */}
                    <div className="bg-[#0D1420] rounded-xl p-4">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Description</p>
                      <p className="text-[13px] text-gray-300 leading-relaxed">{fir.detailed_description || fir.description}</p>
                    </div>

                    {/* Pending Update Requests */}
                    {requests.filter((r: any) => !r.is_acknowledged).length > 0 && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                        <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <ClipboardList className="w-3.5 h-3.5" /> Pending Update Requests
                        </h5>
                        {requests.filter((r: any) => !r.is_acknowledged).map((req: any) => (
                          <div key={req.id} className="flex items-start justify-between gap-3 mb-2 last:mb-0 bg-[#0D1420] rounded-lg p-3">
                            <div>
                              <p className="text-xs text-gray-300">{req.message || 'Status update requested'}</p>
                              <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(req.requested_at)}</p>
                            </div>
                            <button onClick={() => handleAcknowledgeRequest(req.id, 'Update noted. Case is being handled.')}
                              className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg hover:bg-green-500/15 flex items-center gap-1 flex-shrink-0">
                              <Check className="w-3 h-3" /> Acknowledge
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Edit Controls ── */}
                    <div className="bg-[#0D1420] rounded-xl p-4 space-y-4 border border-blue-500/10">
                      <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Pencil className="w-3.5 h-3.5" /> Update Case
                      </h5>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Status */}
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">Status</label>
                          <select value={edit.status || fir.status} onChange={e => setEditState(prev => ({ ...prev, [fir.id]: { ...prev[fir.id], status: e.target.value } }))}
                            className="w-full bg-[#111827] border border-[#1F2D42] rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/40">
                            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>

                        {/* FIR Number */}
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">FIR Number</label>
                          <div className="flex gap-2">
                            <input value={edit.fir_number || ''} onChange={e => setEditState(prev => ({ ...prev, [fir.id]: { ...prev[fir.id], fir_number: e.target.value } }))}
                              placeholder="MP/IND-CN/0042/2026"
                              className="flex-1 bg-[#111827] border border-[#1F2D42] rounded-lg px-3 py-2.5 text-xs text-white font-mono outline-none focus:border-blue-500/40 placeholder:text-gray-700" />
                            {!edit.fir_number && (
                              <button onClick={() => setEditState(prev => ({ ...prev, [fir.id]: { ...prev[fir.id], fir_number: generateFIRNumber() } }))}
                                className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 rounded-lg hover:bg-blue-500/15 flex-shrink-0">
                                Auto
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Assign Officer */}
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">Assign Officer</label>
                          <select value={edit.assigned_officer_id || ''} onChange={e => setEditState(prev => ({ ...prev, [fir.id]: { ...prev[fir.id], assigned_officer_id: e.target.value } }))}
                            className="w-full bg-[#111827] border border-[#1F2D42] rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/40">
                            <option value="">— Unassigned —</option>
                            {officers.map((o: any) => <option key={o.id} value={o.id}>{o.full_name} ({o.rank} · {o.badge_number})</option>)}
                          </select>
                        </div>

                        {/* Rejection Reason (only if rejected) */}
                        {edit.status === 'rejected' && (
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">Rejection Reason</label>
                            <input value={edit.rejection_reason || ''} onChange={e => setEditState(prev => ({ ...prev, [fir.id]: { ...prev[fir.id], rejection_reason: e.target.value } }))}
                              placeholder="Reason for rejection..."
                              className="w-full bg-[#111827] border border-[#1F2D42] rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/40 placeholder:text-gray-700" />
                          </div>
                        )}
                      </div>

                      {/* Note / Case Update */}
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">Public Note (visible to citizen)</label>
                        <textarea value={edit.note || ''} onChange={e => setEditState(prev => ({ ...prev, [fir.id]: { ...prev[fir.id], note: e.target.value } }))}
                          placeholder="Add a public note or update for the citizen..."
                          rows={2} className="w-full bg-[#111827] border border-[#1F2D42] rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/40 resize-none placeholder:text-gray-700" />
                      </div>

                      {/* Submit */}
                      <div className="flex gap-3">
                        <button onClick={() => handleVerifyAndUpdate(fir)} disabled={updatingId === fir.id}
                          className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-blue-500 text-white rounded-xl py-2.5 hover:bg-blue-600 transition-colors disabled:opacity-50">
                          {updatingId === fir.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          {fir.status === 'submitted' ? 'Verify & Register FIR' : 'Update Case'}
                        </button>
                      </div>
                    </div>
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

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs text-gray-300 capitalize">{value}</p>
    </div>
  )
}
