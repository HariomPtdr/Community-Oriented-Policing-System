'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Filter, FileText, ChevronDown, ChevronUp, ChevronRight,
  Clock, Shield, UserCircle, MapPin, AlertTriangle, Eye,
  CheckCircle, Copy, Check, Phone, Star, Loader2,
  Download, RefreshCw, Radar, Scale, Siren, X,
  CircleCheck, CircleX, CircleDot, TrendingUp, Timer,
  Briefcase, ArrowRight, Calendar, Hash, ExternalLink,
  Building2, FileSearch, Handshake, Gavel, FolderClosed,
  Truck, Ban, Info, Package, Image as ImageIcon, Film
} from 'lucide-react'
import { STATUS_VISUAL, CATEGORY_ICONS, PRIORITY_VISUAL } from '@/lib/types'

/* ── FIR Status Steps (from your notes) ───────────────────────── */
const FIR_STATUS_STEPS = [
  { key: 'submitted',            label: 'FIR Submitted',         icon: FileText,    desc: 'Report received and pending review' },
  { key: 'under_review',         label: 'Under Review',          icon: Eye,         desc: 'Being reviewed by desk officer' },
  { key: 'assigned',             label: 'Officer Assigned',      icon: Shield,      desc: 'I/O and F/O assigned to case' },
  { key: 'under_investigation',  label: 'Under Investigation',   icon: FileSearch,  desc: 'Active investigation in progress' },
  { key: 'evidence_collection',  label: 'Evidence Collection',   icon: Briefcase,   desc: 'Collecting evidence and statements' },
  { key: 'accused_identified',   label: 'Accused Identified',    icon: UserCircle,  desc: 'Suspect(s) have been identified' },
  { key: 'accused_arrested',     label: 'Accused Arrested',      icon: Handshake,   desc: 'Suspect(s) taken into custody' },
  { key: 'charge_sheet_filed',   label: 'Charge Sheet Filed',    icon: Gavel,       desc: 'Charge sheet submitted to court' },
  { key: 'resolved',             label: 'Case Resolved',         icon: CheckCircle, desc: 'Case resolved successfully' },
  { key: 'closed',               label: 'Case Closed',           icon: FolderClosed,desc: 'Case officially closed' },
]

const SPECIAL_STATUSES = {
  rejected:    { label: 'Rejected — Contact Nearest Police Station', icon: Ban,   color: 'text-red-400',    bg: 'bg-red-500/10',   border: 'border-red-500/20' },
  transferred: { label: 'Transferred to Other Police Station',       icon: Truck, color: 'text-blue-400',   bg: 'bg-blue-500/10',  border: 'border-blue-500/20' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  low:      { label: 'Low',      color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/20' },
  medium:   { label: 'Medium',   color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  high:     { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  critical: { label: 'Critical', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
}

type Incident = {
  id: string
  title: string
  description: string
  category: string
  status: string
  priority: string
  is_anonymous: boolean
  location_description: string
  occurred_at: string
  created_at: string
  updated_at: string
  resolved_at: string | null
  resolution_notes: string | null
  assigned_officer_id: string | null
  escalation_level: string | null
}

type OfficerInfo = {
  full_name: string
  phone: string
  badge_number: string
  rank: string
  community_rating: number
}

type Evidence = {
  id: string
  file_name: string
  file_size: number
  mime_type: string
  public_url: string
  category: string
}

export default function MyReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    }>
      <MyReportsContent />
    </Suspense>
  )
}

function MyReportsContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [reports, setReports] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [officerCache, setOfficerCache] = useState<Record<string, OfficerInfo>>({})
  const [loadingOfficer, setLoadingOfficer] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [descExpanded, setDescExpanded] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [evidenceCache, setEvidenceCache] = useState<Record<string, Evidence[]>>({})
  const [loadingEvidence, setLoadingEvidence] = useState<string | null>(null)

  const statusVisual = STATUS_VISUAL as Record<string, { label: string; bg: string; text: string; dot: string }>
  const categoryIcons = CATEGORY_ICONS as Record<string, string>

  // ── Load Reports ───────────────────────────────────
  const loadReports = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('incidents')
      .select('*')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false })

    setReports((data as Incident[]) || [])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { loadReports() }, [loadReports])

  // ── Load Officer Info ──────────────────────────────
  const loadOfficer = async (officerId: string) => {
    if (officerCache[officerId]) return
    setLoadingOfficer(officerId)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', officerId)
      .single()

    const { data: officerData } = await supabase
      .from('officer_profiles')
      .select('badge_number, rank, community_rating')
      .eq('id', officerId)
      .single()

    if (profileData && officerData) {
      setOfficerCache(prev => ({
        ...prev,
        [officerId]: {
          full_name: profileData.full_name,
          phone: profileData.phone,
          badge_number: officerData.badge_number,
          rank: officerData.rank,
          community_rating: officerData.community_rating,
        }
      }))
    }
    setLoadingOfficer(null)
  }

  // ── Load Evidence Info ─────────────────────────────
  const loadEvidence = async (incidentId: string) => {
    if (evidenceCache[incidentId]) return
    setLoadingEvidence(incidentId)

    const { data } = await supabase
      .from('incident_evidence')
      .select('*')
      .eq('incident_id', incidentId)

    if (data) {
      setEvidenceCache(prev => ({ ...prev, [incidentId]: data }))
    }
    setLoadingEvidence(null)
  }

  // ── Toggle Expand ──────────────────────────────────
  const toggleExpand = (report: Incident) => {
    if (expandedId === report.id) {
      setExpandedId(null)
    } else {
      setExpandedId(report.id)
      if (report.assigned_officer_id) {
        loadOfficer(report.assigned_officer_id)
      }
      loadEvidence(report.id)
    }
  }

  // ── Utilities ──────────────────────────────────────
  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    return `${Math.floor(days / 30)}mo ago`
  }

  const daysSince = (dateStr: string) => Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const getStatusIndex = (status: string) => {
    const idx = FIR_STATUS_STEPS.findIndex(s => s.key === status)
    // Map existing statuses to our extended pipeline
    if (idx >= 0) return idx
    if (status === 'in_progress') return 3 // maps to under_investigation
    return 0
  }

  // ── Filtering ──────────────────────────────────────
  const filteredReports = reports.filter(r => {
    const matchesSearch = !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus
    const matchesPriority = filterPriority === 'all' || r.priority === filterPriority
    return matchesSearch && matchesStatus && matchesPriority
  })

  // ── Stats ──────────────────────────────────────────
  const stats = {
    total: reports.length,
    active: reports.filter(r => !['resolved', 'closed', 'rejected'].includes(r.status)).length,
    resolved: reports.filter(r => r.status === 'resolved' || r.status === 'closed').length,
    critical: reports.filter(r => r.priority === 'critical').length,
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* ── Hero Header ──────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#111827] via-[#131D2E] to-[#111827] border border-[#1F2D42] rounded-2xl p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-400" />
              </div>
              My Reports & FIR Tracking
            </h1>
            <p className="text-sm text-gray-400 mt-1.5 ml-[46px]">View, track status, and monitor your filed incident reports in real-time</p>
          </div>
          <div className="flex items-center gap-3 ml-[46px] md:ml-0">
            <button
              onClick={() => { setRefreshing(true); loadReports() }}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white bg-[#0D1420] border border-[#1F2D42] px-3.5 py-2 rounded-xl transition-all hover:border-[#2A3A52]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 ml-[46px] md:ml-0">
          {[
            { label: 'Total Filed', value: stats.total, color: 'text-white', icon: FileText, iconColor: 'text-gray-500' },
            { label: 'Active', value: stats.active, color: 'text-amber-400', icon: Clock, iconColor: 'text-amber-500' },
            { label: 'Resolved', value: stats.resolved, color: 'text-green-400', icon: CheckCircle, iconColor: 'text-green-500' },
            { label: 'Critical', value: stats.critical, color: 'text-red-400', icon: AlertTriangle, iconColor: 'text-red-500' },
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

      {/* ── Search & Filters ─────────────────────────────── */}
      <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title, ID, or category..."
              className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-orange-500/40 transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border transition-all ${
              showFilters || filterStatus !== 'all' || filterPriority !== 'all'
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                : 'bg-[#0D1420] border-[#1F2D42] text-gray-400 hover:text-white hover:border-[#2A3A52]'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filter
            {(filterStatus !== 'all' || filterPriority !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-orange-500" />
            )}
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-[#1F2D42] grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {['all', 'submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'closed'].map(s => (
                  <button key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg transition-all font-medium ${
                      filterStatus === s
                        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                        : 'bg-[#0D1420] text-gray-400 border border-[#1F2D42] hover:text-white'
                    }`}
                  >
                    {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Priority</p>
              <div className="flex gap-1.5">
                {['all', 'low', 'medium', 'high', 'critical'].map(p => (
                  <button key={p}
                    onClick={() => setFilterPriority(p)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg transition-all font-medium capitalize ${
                      filterPriority === p
                        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                        : 'bg-[#0D1420] text-gray-400 border border-[#1F2D42] hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Reports List ─────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0D1420] border border-[#1F2D42] flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-gray-600" />
          </div>
          <p className="text-white font-medium">{searchQuery ? 'No matching reports' : 'No reports yet'}</p>
          <p className="text-sm text-gray-500 mt-1">
            {searchQuery ? 'Try a different search term' : 'When you file an incident report, it will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map(report => {
            const isExpanded = expandedId === report.id
            const sv = statusVisual[report.status]
            const pc = PRIORITY_CONFIG[report.priority]
            const officer = report.assigned_officer_id ? officerCache[report.assigned_officer_id] : null
            const currentStatusIdx = getStatusIndex(report.status)
            const staleDays = daysSince(report.updated_at)

            return (
              <div key={report.id} className="bg-[#111827] border border-[#1F2D42] hover:border-[#2A3A52] rounded-2xl overflow-hidden transition-all duration-300">
                {/* ── Report Row ──────────────────────── */}
                <button
                  onClick={() => router.push(`/citizen/my-reports/${report.id}`)}
                  className="w-full text-left p-5 flex items-center gap-4 group hover:bg-[#1A2235]/30 transition-colors"
                >
                  {/* Category Icon */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-[#0D1420] border border-[#1F2D42]">
                    {categoryIcons[report.category] || '📄'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-mono text-orange-400">{report.id.slice(0, 8)}...</span>
                      <button onClick={e => { e.stopPropagation(); copyId(report.id) }}
                        className="text-gray-600 hover:text-orange-400 transition-colors">
                        {copied === report.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="text-sm text-white font-medium truncate group-hover:text-orange-400 transition-colors">{report.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(report.created_at)}
                      </span>
                      {report.assigned_officer_id ? (
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Officer Assigned
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-600 flex items-center gap-1">
                          <UserCircle className="w-3 h-3" />
                          Unassigned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side: badges */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Stale warning */}
                    {staleDays > 7 && !['resolved', 'closed', 'rejected'].includes(report.status) && (
                      <div className="hidden sm:flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <AlertTriangle className="w-3 h-3" />
                        {staleDays}d stale
                      </div>
                    )}
                    {sv && (
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${sv.text} ${sv.bg} uppercase tracking-wider hidden sm:inline`}>
                        {sv.label}
                      </span>
                    )}
                    {pc && (
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${pc.color} ${pc.bg} uppercase tracking-wider hidden sm:inline`}>
                        {pc.label}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>

                {/* Mobile badges */}
                <div className="sm:hidden px-5 pb-4 flex items-center gap-2 border-t border-[#1F2D42]/30 pt-3 mt-1">
                  {sv && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${sv.text} ${sv.bg} uppercase tracking-widest`}>
                      {sv.label}
                    </span>
                  )}
                  {pc && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${pc.color} ${pc.bg} uppercase tracking-widest`}>
                      {pc.label}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
