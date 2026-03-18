'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useSHORealtime } from '@/lib/hooks/sho/useSHORealtime'
import {
  Search, Filter, ChevronRight, ChevronDown, Eye, Shield, UserCircle,
  CheckCircle, Loader2, Clock, AlertTriangle, Hash, Calendar, MapPin,
  Phone, Mail, FileText, X, Send, Ban, Check, Pencil, ArrowUpDown,
  ExternalLink, Copy, ChevronLeft, MoreVertical, Inbox, BookOpen,
  Scale, Users, Info, RefreshCw, Briefcase
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────

type Complaint = {
  id: string
  reference_number: string
  complainant_name: string
  category: string
  incident_location: string
  incident_date: string
  status: string
  urgency_flag: boolean
  created_at: string
  sho_first_opened_at: string | null
  description: string
  mobile_primary: string
  email: string
  gender: string
  father_name: string
  address: string
  district: string
  incident_lat: number | null
  incident_lon: number | null
  incident_time: string
  evidence_count: number
  extra_fields: any
  station_id: string
  filing_for: string
  behalf_name: string
  behalf_relation: string
  rejected_reason: string | null
  evidence_paths: string[]
  suggested_sections: string[]
  priority_flags: string[]
}

type ActionPanel = 'none' | 'assign' | 'reject' | 'forward' | 'requestInfo' | 'registerFIR'

// ── Status Config ──────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  PENDING: { color: 'text-orange-400', bg: 'bg-orange-500/15', label: 'Pending' },
  OPENED: { color: 'text-blue-400', bg: 'bg-blue-500/15', label: 'Opened' },
  AWAITING_INFO: { color: 'text-yellow-400', bg: 'bg-yellow-500/15', label: 'Awaiting Info' },
  CONVERTED: { color: 'text-green-400', bg: 'bg-green-500/15', label: 'FIR Registered' },
  REJECTED: { color: 'text-red-400', bg: 'bg-red-500/15', label: 'Rejected' },
  FORWARDED: { color: 'text-purple-400', bg: 'bg-purple-500/15', label: 'Forwarded' },
}

const CATEGORY_LABELS: Record<string, string> = {
  theft: 'Theft', assault: 'Assault', vandalism: 'Vandalism', robbery: 'Robbery',
  burglary: 'Burglary', traffic: 'Traffic', noise_complaint: 'Noise',
  suspicious_activity: 'Suspicious Activity', drug_activity: 'Drug Activity',
  domestic: 'Domestic', missing_person: 'Missing Person', other: 'Other',
  simple_theft: 'Simple Theft', cyber_crime: 'Cyber Crime',
  cheating_fraud: 'Fraud', ncr: 'NCR',
}

const URGENCY_COLORS: Record<string, string> = {
  true: 'border-l-red-500',
  false: 'border-l-transparent',
}

// ── Utilities ──────────────────────────────────────────────

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const is48hOverdue = (d: string) => Date.now() - new Date(d).getTime() > 48 * 60 * 60 * 1000

export default function ComplaintsQueuePage() {
  const { user } = useCurrentUser()
  const supabase = createClient()

  // ── State ──────────────────────────────────────────────
  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterUrgency, setFilterUrgency] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [actionPanel, setActionPanel] = useState<ActionPanel>('none')
  const [officers, setOfficers] = useState<any[]>([])
  const [processing, setProcessing] = useState(false)

  // Action form states
  const [selectedOfficer, setSelectedOfficer] = useState('')
  const [legalSections, setLegalSections] = useState<string[]>([])
  const [sectionInput, setSectionInput] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectExplanation, setRejectExplanation] = useState('')
  const [forwardStation, setForwardStation] = useState('')
  const [forwardReason, setForwardReason] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  // ── Data Loading ──────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user?.stationId) return

    // Try loading from complaints table (CODPP schema)
    const { data: codppData, error: codppError } = await supabase
      .from('complaints')
      .select('*')
      .eq('station_id', user.stationId)
      .in('status', ['PENDING', 'OPENED', 'AWAITING_INFO'])
      .order('created_at', { ascending: true })

    if (!codppError && codppData && codppData.length > 0) {
      setComplaints(codppData)
    } else {
      // Fallback: load from incidents table (legacy schema)
      const { data: incidents } = await supabase
        .from('incidents')
        .select('*')
        .eq('status', 'submitted')
        .order('created_at', { ascending: true })

      if (incidents) {
        // Transform to complaint-like objects
        setComplaints(incidents.map(inc => ({
          id: inc.id,
          reference_number: inc.fir_number || inc.id.slice(0, 8),
          complainant_name: inc.c_full_name || 'Unknown',
          category: inc.category || inc.complaint_type || 'other',
          incident_location: inc.location_description || `${inc.i_district || ''}, ${inc.i_police_station || ''}`,
          incident_date: inc.i_date || inc.created_at,
          status: 'PENDING',
          urgency_flag: inc.priority === 'critical' || inc.priority === 'high',
          created_at: inc.created_at,
          sho_first_opened_at: null,
          description: inc.detailed_description || inc.description,
          mobile_primary: inc.c_mobile || '',
          email: inc.c_email || '',
          gender: inc.c_gender || '',
          father_name: inc.c_father_name || '',
          address: inc.c_address || '',
          district: inc.i_district || '',
          incident_lat: inc.latitude,
          incident_lon: inc.longitude,
          incident_time: inc.i_approx_time || '',
          evidence_count: 0,
          extra_fields: {},
          station_id: inc.station_id || '',
          filing_for: inc.filing_mode || 'self',
          behalf_name: inc.behalf_name || '',
          behalf_relation: inc.behalf_relation || '',
          rejected_reason: inc.rejection_reason,
          evidence_paths: [],
          suggested_sections: [],
          priority_flags: inc.priority ? [inc.priority] : [],
          // Keep original for updates
          _legacy: true,
          _original: inc,
        })))
      }
    }

    // Load station officers for assignment
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

  useEffect(() => { loadData() }, [loadData])

  // Realtime updates
  useSHORealtime(user?.stationId, user?.id, {
    onNewComplaint: () => loadData(),
    onComplaintUpdate: () => loadData(),
  })

  // ── Filtering ──────────────────────────────────────────
  const filtered = complaints.filter(c => {
    const matchSearch = !searchQuery ||
      c.complainant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.reference_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.mobile_primary?.includes(searchQuery) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    const matchCategory = filterCategory === 'all' || c.category === filterCategory
    const matchUrgency = filterUrgency === 'all' ||
      (filterUrgency === 'urgent' && c.urgency_flag) ||
      (filterUrgency === 'overdue' && is48hOverdue(c.created_at))
    return matchSearch && matchStatus && matchCategory && matchUrgency
  })

  const selected = complaints.find(c => c.id === selectedId)

  // ── Stats ──────────────────────────────────────────────
  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'PENDING').length,
    overdue: complaints.filter(c => is48hOverdue(c.created_at)).length,
    urgent: complaints.filter(c => c.urgency_flag).length,
  }

  // ── Actions ──────────────────────────────────────────────

  const handleOpenComplaint = async (complaint: any) => {
    setSelectedId(complaint.id)
    setActionPanel('none')

    if (complaint.status === 'PENDING' && !complaint.sho_first_opened_at) {
      if (complaint._legacy) {
        await supabase.from('incidents').update({ status: 'under_review' }).eq('id', complaint.id)
      } else {
        await supabase.from('complaints').update({
          status: 'OPENED',
          sho_first_opened_at: new Date().toISOString(),
        }).eq('id', complaint.id)
      }
      loadData()
    }
  }

  const handleRegisterFIR = async () => {
    if (!selected || !user) return
    if (!selectedOfficer) { alert('Please select an Investigating Officer'); return }
    if (legalSections.length === 0) { alert('Please add at least one legal section'); return }

    setProcessing(true)

    if (selected._legacy) {
      // Legacy: update incident
      const prefix = 'MP/IND-CN'
      const num = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
      const year = new Date().getFullYear()
      const firNumber = `${prefix}/${num}/${year}`

      await supabase.from('incidents').update({
        status: 'under_review',
        fir_number: firNumber,
        assigned_officer_id: selectedOfficer,
        verified_at: new Date().toISOString(),
        verified_by: user.id,
      }).eq('id', selected.id)

      // Notify citizen
      if (selected._original?.reporter_id) {
        await supabase.from('notifications').insert({
          user_id: selected._original.reporter_id,
          title: 'FIR Registered',
          body: `Your complaint has been registered as FIR ${firNumber}. IO has been assigned.`,
          type: 'fir_registered',
          reference_id: selected.id,
        })
      }
    } else {
      // CODPP: create fir_records entry
      const { data: firNumber } = await supabase.rpc('generate_fir_number', { p_station_id: user.stationId })
      await supabase.from('fir_records').insert({
        fir_number: firNumber || `FIR-${Date.now()}`,
        complaint_id: selected.id,
        station_id: user.stationId,
        io_id: selectedOfficer,
        registered_by_sho: user.id,
        legal_sections: legalSections,
        case_status: 'FIR_REGISTERED',
      })
      await supabase.from('complaints').update({ status: 'CONVERTED' }).eq('id', selected.id)
    }

    setProcessing(false)
    setActionPanel('none')
    setSelectedOfficer('')
    setLegalSections([])
    setSectionInput('')
    setSelectedId(null)
    loadData()
  }

  const handleReject = async () => {
    if (!selected || !rejectReason) return
    if (rejectExplanation.length < 20) {
      alert('Explanation must be at least 20 characters')
      return
    }

    setProcessing(true)

    if (selected._legacy) {
      await supabase.from('incidents').update({
        status: 'rejected',
        rejection_reason: `${rejectReason}: ${rejectExplanation}`,
      }).eq('id', selected.id)

      if (selected._original?.reporter_id) {
        await supabase.from('notifications').insert({
          user_id: selected._original.reporter_id,
          title: 'Complaint Update',
          body: `Your complaint has been reviewed. Reason: ${rejectReason}`,
          type: 'complaint_rejected',
          reference_id: selected.id,
        })
      }
    } else {
      await supabase.from('complaints').update({
        status: 'REJECTED',
        rejected_reason: rejectReason,
        rejected_explanation: rejectExplanation,
      }).eq('id', selected.id)
    }

    setProcessing(false)
    setActionPanel('none')
    setRejectReason('')
    setRejectExplanation('')
    setSelectedId(null)
    loadData()
  }

  const addSection = () => {
    if (sectionInput.trim() && !legalSections.includes(sectionInput.trim())) {
      setLegalSections(prev => [...prev, sectionInput.trim()])
      setSectionInput('')
    }
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-72px)] flex flex-col">
      {/* Header with stats */}
      <div className="flex-shrink-0 px-1 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-white">Complaints Queue</h1>
              <p className="text-xs text-gray-500">FIFO processing · First come, first served</p>
            </div>
          </div>
          <button onClick={() => loadData()}
            className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white bg-[#111827] border border-[#1F2D42] px-3 py-2 rounded-xl transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'In Queue', value: stats.total, color: 'text-white' },
            { label: 'Pending', value: stats.pending, color: 'text-orange-400' },
            { label: 'Overdue 48h', value: stats.overdue, color: stats.overdue > 0 ? 'text-red-400' : 'text-gray-400' },
            { label: 'Urgent', value: stats.urgent, color: stats.urgent > 0 ? 'text-red-400' : 'text-gray-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#111827] border border-[#1F2D42] rounded-xl p-3 text-center">
              <p className={`text-lg font-heading font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex-shrink-0 px-1 pb-3">
        <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, reference, mobile..."
                className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-gray-600 outline-none focus:border-blue-500/40 transition-colors"
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-all ${
                showFilters || filterStatus !== 'all' || filterCategory !== 'all'
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-[#0D1420] border-[#1F2D42] text-gray-400 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 pt-3 border-t border-[#1F2D42] grid grid-cols-3 gap-3">
              <div>
                <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5 font-semibold">Status</p>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-lg px-2 py-1.5 text-[11px] text-white outline-none"
                >
                  <option value="all">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="OPENED">Opened</option>
                  <option value="AWAITING_INFO">Awaiting Info</option>
                </select>
              </div>
              <div>
                <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5 font-semibold">Category</p>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                  className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-lg px-2 py-1.5 text-[11px] text-white outline-none"
                >
                  <option value="all">All Categories</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1.5 font-semibold">Priority</p>
                <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}
                  className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-lg px-2 py-1.5 text-[11px] text-white outline-none"
                >
                  <option value="all">All</option>
                  <option value="urgent">Urgent Only</option>
                  <option value="overdue">Overdue 48h+</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Split Panel Layout */}
      <div className="flex-1 flex gap-3 px-1 min-h-0 overflow-hidden">
        {/* Left: Queue List */}
        <div className={`${selectedId ? 'hidden md:flex md:w-[340px] lg:w-[380px]' : 'w-full'} flex-col flex-shrink-0 overflow-hidden`}>
          <div className="overflow-y-auto flex-1 custom-scrollbar space-y-1.5">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl py-16 text-center">
                <Inbox className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                <p className="text-white font-medium text-sm">Queue is empty</p>
                <p className="text-xs text-gray-500 mt-1">All complaints have been processed</p>
              </div>
            ) : (
              filtered.map((c, idx) => {
                const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.PENDING
                const overdue = is48hOverdue(c.created_at)
                const isSelected = selectedId === c.id
                return (
                  <button key={c.id} onClick={() => handleOpenComplaint(c)}
                    className={`w-full text-left transition-all rounded-xl border-l-[3px] ${
                      isSelected
                        ? 'bg-blue-500/10 border-l-blue-500 border border-blue-500/30'
                        : overdue
                          ? 'bg-[#111827] border-l-red-500 border border-[#1F2D42] hover:border-red-500/30'
                          : c.urgency_flag
                            ? 'bg-[#111827] border-l-orange-500 border border-[#1F2D42] hover:border-orange-500/30'
                            : 'bg-[#111827] border-l-transparent border border-[#1F2D42] hover:border-[#2A3A52]'
                    } p-3.5`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono text-gray-500">#{idx + 1}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sc.color} ${sc.bg}`}>
                          {sc.label}
                        </span>
                        {overdue && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-bold">
                            OVERDUE
                          </span>
                        )}
                        {c.urgency_flag && (
                          <AlertTriangle className="w-3 h-3 text-orange-400 flex-shrink-0" />
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                    </div>

                    <p className="text-sm text-white font-medium truncate mb-1">{c.complainant_name || 'Anonymous'}</p>

                    <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-1">
                      <span className="capitalize">{CATEGORY_LABELS[c.category] || c.category?.replace(/_/g, ' ')}</span>
                      <span>·</span>
                      <span>{c.reference_number?.slice(0, 12) || c.id?.slice(0, 8)}</span>
                    </div>

                    <p className="text-[11px] text-gray-400 line-clamp-1 mb-1.5">{c.description}</p>

                    <div className="flex items-center gap-2 text-[10px] text-gray-600">
                      <Clock className="w-3 h-3" />
                      <span>{timeAgo(c.created_at)}</span>
                      {c.incident_location && (
                        <>
                          <span>·</span>
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">{c.incident_location}</span>
                        </>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right: Detail Panel */}
        {selectedId && selected ? (
          <div className="flex-1 flex flex-col bg-[#111827] border border-[#1F2D42] rounded-2xl overflow-hidden min-w-0">
            {/* Detail Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1F2D42] bg-gradient-to-r from-[#111827] to-[#131D2E]">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => { setSelectedId(null); setActionPanel('none') }}
                  className="md:hidden w-8 h-8 rounded-lg bg-[#0D1420] border border-[#1F2D42] flex items-center justify-center text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white truncate">{selected.complainant_name}</h2>
                  <p className="text-[10px] text-gray-500">{selected.reference_number || selected.id.slice(0, 12)} · {formatDate(selected.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {selected.mobile_primary && (
                  <a href={`tel:${selected.mobile_primary}`}
                    className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/20 transition-colors"
                    title="Call Complainant"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Detail Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
              {/* Complainant Info */}
              <div>
                <h3 className="cops-section-title flex items-center gap-1.5">
                  <UserCircle className="w-3.5 h-3.5" /> Complainant Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <InfoCell label="Full Name" value={selected.complainant_name || selected._original?.c_full_name || '—'} />
                  <InfoCell label="Mobile" value={selected.mobile_primary || selected._original?.c_mobile || '—'} />
                  <InfoCell label="Father/Husband" value={selected.father_name || selected._original?.c_father_name || '—'} />
                  <InfoCell label="Gender" value={selected.gender || selected._original?.c_gender || '—'} />
                  <InfoCell label="Address" value={selected.address || selected._original?.c_address || '—'} span={2} />
                  {selected.email && <InfoCell label="Email" value={selected.email} />}
                  {selected.filing_for !== 'self' && (
                    <>
                      <InfoCell label="Filing For" value={`${selected.behalf_name} (${selected.behalf_relation})`} />
                    </>
                  )}
                </div>
              </div>

              {/* Incident Details */}
              <div>
                <h3 className="cops-section-title flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Incident Details
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <InfoCell label="Category" value={CATEGORY_LABELS[selected.category] || selected.category?.replace(/_/g, ' ')} />
                  <InfoCell label="Date" value={selected.incident_date ? formatDate(selected.incident_date) : '—'} />
                  <InfoCell label="Location" value={selected.incident_location || '—'} span={2} />
                  {selected.incident_time && <InfoCell label="Time" value={selected.incident_time} />}
                  {selected.district && <InfoCell label="District" value={selected.district} />}
                </div>
                <div className="bg-[#0D1420] rounded-xl p-4">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 font-semibold">Description</p>
                  <p className="text-[13px] text-gray-300 leading-relaxed whitespace-pre-wrap">{selected.description || '—'}</p>
                </div>
              </div>

              {/* Evidence */}
              {(selected.evidence_count > 0 || selected.evidence_paths?.length > 0) && (
                <div>
                  <h3 className="cops-section-title flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Evidence ({selected.evidence_count || selected.evidence_paths?.length || 0})
                  </h3>
                  <div className="bg-[#0D1420] rounded-xl p-4 text-xs text-gray-400">
                    {selected.evidence_paths?.length > 0
                      ? selected.evidence_paths.map((path: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 py-1">
                            <FileText className="w-3 h-3 text-gray-600" />
                            <span className="truncate">{path.split('/').pop()}</span>
                          </div>
                        ))
                      : <p>Evidence files attached to this complaint</p>
                    }
                  </div>
                </div>
              )}

              {/* Suggested Sections */}
              {selected.suggested_sections?.length > 0 && (
                <div>
                  <h3 className="cops-section-title flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" /> Suggested IPC Sections
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.suggested_sections.map((s: string) => (
                      <span key={s} className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded-lg font-mono">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex-shrink-0 border-t border-[#1F2D42] bg-[#0D1420] p-4">
              {actionPanel === 'none' ? (
                <div className="flex gap-2">
                  <button onClick={() => setActionPanel('registerFIR')}
                    className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold bg-blue-500 text-white rounded-xl py-2.5 hover:bg-blue-600 transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5" /> Register FIR
                  </button>
                  <button onClick={() => setActionPanel('reject')}
                    className="flex items-center justify-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 hover:bg-red-500/20 transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button onClick={() => setActionPanel('requestInfo')}
                    className="flex items-center justify-center gap-1.5 text-xs font-medium text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2.5 hover:bg-yellow-500/20 transition-colors"
                  >
                    <Info className="w-3.5 h-3.5" /> Info
                  </button>
                </div>
              ) : actionPanel === 'registerFIR' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> Register FIR
                    </h4>
                    <button onClick={() => setActionPanel('none')} className="text-gray-500 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Assign IO */}
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                      Investigating Officer <span className="text-red-400">*</span>
                    </label>
                    <select value={selectedOfficer} onChange={e => setSelectedOfficer(e.target.value)}
                      className="w-full bg-[#111827] border border-[#1F2D42] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500/40"
                    >
                      <option value="">— Select Officer —</option>
                      {officers.map(o => (
                        <option key={o.id} value={o.id}>{o.full_name} ({o.rank} · {o.badge_number})</option>
                      ))}
                    </select>
                  </div>

                  {/* Legal Sections */}
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                      IPC Sections <span className="text-red-400">*</span>
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input value={sectionInput} onChange={e => setSectionInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSection())}
                        placeholder="e.g. 379 IPC"
                        className="flex-1 bg-[#111827] border border-[#1F2D42] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500/40 placeholder:text-gray-700 font-mono"
                      />
                      <button onClick={addSection}
                        className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 rounded-lg hover:bg-blue-500/20"
                      >
                        Add
                      </button>
                    </div>
                    {legalSections.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {legalSections.map(s => (
                          <span key={s} className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded-lg font-mono flex items-center gap-1">
                            {s}
                            <button onClick={() => setLegalSections(prev => prev.filter(x => x !== s))}>
                              <X className="w-2.5 h-2.5 text-gray-500 hover:text-white" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={handleRegisterFIR} disabled={processing || !selectedOfficer || legalSections.length === 0}
                    className="w-full flex items-center justify-center gap-2 text-xs font-semibold bg-blue-500 text-white rounded-xl py-2.5 hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    Confirm & Register FIR
                  </button>
                </div>
              ) : actionPanel === 'reject' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Ban className="w-3.5 h-3.5" /> Reject Complaint
                    </h4>
                    <button onClick={() => setActionPanel('none')} className="text-gray-500 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">Reason</label>
                    <select value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                      className="w-full bg-[#111827] border border-[#1F2D42] rounded-lg px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="">— Select Reason —</option>
                      <option value="DUPLICATE">Duplicate complaint</option>
                      <option value="INSUFFICIENT_INFO">Insufficient information</option>
                      <option value="NOT_COGNIZABLE">Not a cognizable offence</option>
                      <option value="JURISDICTION">Jurisdiction mismatch</option>
                      <option value="FALSE_REPORT">Suspected false report</option>
                      <option value="CIVIL_MATTER">Civil matter — not police jurisdiction</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">
                      Explanation (min 20 chars)
                    </label>
                    <textarea value={rejectExplanation} onChange={e => setRejectExplanation(e.target.value)}
                      placeholder="Provide a detailed explanation for rejection..."
                      rows={3}
                      className="w-full bg-[#111827] border border-[#1F2D42] rounded-lg px-3 py-2 text-xs text-white outline-none resize-none placeholder:text-gray-700"
                    />
                    <p className="text-[9px] text-gray-600 mt-0.5">{rejectExplanation.length}/20 minimum</p>
                  </div>

                  <button onClick={handleReject} disabled={processing || !rejectReason || rejectExplanation.length < 20}
                    className="w-full flex items-center justify-center gap-2 text-xs font-semibold bg-red-500 text-white rounded-xl py-2.5 hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                    Confirm Rejection
                  </button>
                </div>
              ) : actionPanel === 'requestInfo' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" /> Request Additional Info
                    </h4>
                    <button onClick={() => setActionPanel('none')} className="text-gray-500 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea value={infoMessage} onChange={e => setInfoMessage(e.target.value)}
                    placeholder="What additional information do you need from the complainant?"
                    rows={3}
                    className="w-full bg-[#111827] border border-[#1F2D42] rounded-lg px-3 py-2 text-xs text-white outline-none resize-none placeholder:text-gray-700"
                  />
                  <button
                    disabled={processing || !infoMessage}
                    onClick={async () => {
                      setProcessing(true)
                      if (selected._legacy) {
                        if (selected._original?.reporter_id) {
                          await supabase.from('notifications').insert({
                            user_id: selected._original.reporter_id,
                            title: 'Information Requested',
                            body: infoMessage,
                            type: 'info_request',
                            reference_id: selected.id,
                          })
                        }
                      } else {
                        await supabase.from('complaints').update({ status: 'AWAITING_INFO' }).eq('id', selected.id)
                      }
                      setProcessing(false)
                      setActionPanel('none')
                      setInfoMessage('')
                      loadData()
                    }}
                    className="w-full flex items-center justify-center gap-2 text-xs font-semibold bg-yellow-500 text-black rounded-xl py-2.5 hover:bg-yellow-400 transition-colors disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Send Request
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : !selectedId && !loading && filtered.length > 0 ? (
          <div className="hidden md:flex flex-1 items-center justify-center bg-[#111827] border border-[#1F2D42] rounded-2xl">
            <div className="text-center">
              <Inbox className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Select a complaint to review</p>
              <p className="text-[11px] text-gray-600 mt-1">Click on any item from the queue</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── Helper Components ────────────────────────────────────────

function InfoCell({ label, value, span = 1 }: { label: string; value: string; span?: number }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5 font-semibold">{label}</p>
      <p className="text-xs text-gray-300 capitalize">{value}</p>
    </div>
  )
}
