'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import {
  BarChart3, FileText, Eye, Users, TrendingUp, Clock,
  ChevronRight, Loader2, RefreshCw, Plus, Send, Edit,
  Trash2, X, CheckCircle, AlertTriangle, ArrowUpRight,
  Globe, MessageCircle, ThumbsUp
} from 'lucide-react'

type Report = {
  id: string
  title: string
  status: string // DRAFT | PUBLISHED | RETRACTED
  report_type: string
  period_start: string
  period_end: string
  content: string
  stats_snapshot: any
  published_at: string | null
  created_at: string
  view_count: number
  feedback_count: number
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT: { color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20', label: 'Draft' },
  PUBLISHED: { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', label: 'Published' },
  RETRACTED: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Retracted' },
}

export default function TransparencyPage() {
  const { user } = useCurrentUser()
  const supabase = createClient()

  const [reports, setReports] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'reports' | 'announcements' | 'stats'>('reports')
  const [editingReport, setEditingReport] = useState<any>(null)
  const [showNewReport, setShowNewReport] = useState(false)
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Form state
  const [reportTitle, setReportTitle] = useState('')
  const [reportContent, setReportContent] = useState('')
  const [reportType, setReportType] = useState('monthly')
  const [annTitle, setAnnTitle] = useState('')
  const [annMessage, setAnnMessage] = useState('')
  const [annPriority, setAnnPriority] = useState('normal')
  const [annCategory, setAnnCategory] = useState('general')

  // Station stats for display
  const [stationStats, setStationStats] = useState<any>(null)

  const loadData = useCallback(async () => {
    if (!user?.stationId) return

    // Load announcements from sho_announcements table
    const { data: anns } = await supabase
      .from('sho_announcements')
      .select('*')
      .eq('station_id', user.stationId)
      .order('created_at', { ascending: false })

    setAnnouncements(anns || [])

    // Load monthly stats
    const now = new Date()
    const { data: monthStats } = await supabase
      .from('monthly_police_stats')
      .select('*')
      .eq('station_id', user.stationId)
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear())
      .single()

    if (monthStats) setStationStats(monthStats)

    // Calculate live stats if no monthly stats
    if (!monthStats) {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const [incidents, resolved, patrol] = await Promise.all([
        supabase.from('incidents').select('id', { count: 'exact', head: true })
          .gte('created_at', monthStart),
        supabase.from('incidents').select('id', { count: 'exact', head: true })
          .in('status', ['resolved', 'closed']).gte('created_at', monthStart),
        supabase.from('patrol_logs').select('id', { count: 'exact', head: true })
          .gte('started_at', monthStart),
      ])
      setStationStats({
        total_cases: incidents.count || 0,
        cases_solved: resolved.count || 0,
        cases_pending: (incidents.count || 0) - (resolved.count || 0),
        patrol_hours: patrol.count || 0,
        safety_score: 75,
      })
    }

    setLoading(false)
  }, [user?.stationId])

  useEffect(() => { loadData() }, [loadData])

  const handleCreateAnnouncement = async () => {
    if (!user?.stationId || !annTitle || !annMessage) return
    setProcessing(true)

    await supabase.from('sho_announcements').insert({
      station_id: user.stationId,
      created_by: user.id,
      title: annTitle,
      message: annMessage,
      priority: annPriority,
      category: annCategory,
    })

    setProcessing(false)
    setShowNewAnnouncement(false)
    setAnnTitle('')
    setAnnMessage('')
    setAnnPriority('normal')
    setAnnCategory('general')
    loadData()
  }

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Delete this announcement?')) return
    await supabase.from('sho_announcements').update({ is_active: false }).eq('id', id)
    loadData()
  }

  const PRIORITY_COLORS: Record<string, string> = {
    low: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
    normal: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    urgent: 'text-red-400 bg-red-500/10 border-red-500/20',
  }

  const CATEGORY_ICONS: Record<string, string> = {
    general: '📢', safety: '🛡️', advisory: '⚠️', traffic: '🚦',
    festival: '🎉', weather: '🌧️', curfew: '🚫', other: '📋',
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-white">Transparency & Reports</h1>
            <p className="text-xs text-gray-500">Public accountability · Station statistics · Citizen communication</p>
          </div>
        </div>
        <button onClick={loadData}
          className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white bg-[#111827] border border-[#1F2D42] px-3 py-2 rounded-xl transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Station Performance Overview */}
      {stationStats && (
        <div className="bg-gradient-to-r from-indigo-500/10 via-[#111827] to-purple-500/10 border border-indigo-500/20 rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Current Month Performance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Cases', value: stationStats.total_cases, icon: FileText },
              { label: 'Solved', value: stationStats.cases_solved, icon: CheckCircle },
              { label: 'Pending', value: stationStats.cases_pending, icon: Clock },
              { label: 'Patrol Logs', value: stationStats.patrol_hours, icon: Eye },
              { label: 'Safety Score', value: `${stationStats.safety_score}/100`, icon: TrendingUp },
            ].map(s => (
              <div key={s.label} className="text-center">
                <s.icon className="w-4 h-4 text-gray-600 mx-auto mb-1" />
                <p className="text-xl font-heading font-bold text-white">{s.value}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111827] border border-[#1F2D42] rounded-xl p-1">
        {([
          { key: 'announcements', label: '📢 Announcements' },
          { key: 'stats', label: '📊 Station Stats' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${
              tab === t.key ? 'bg-[#0B0F1A] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'announcements' ? (
        <div className="space-y-3">
          {/* New Announcement Button */}
          <button onClick={() => setShowNewAnnouncement(true)}
            className="w-full bg-indigo-500/10 border border-indigo-500/20 border-dashed rounded-2xl p-4 flex items-center justify-center gap-2 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Create New Announcement</span>
          </button>

          {/* New Announcement Form */}
          {showNewAnnouncement && (
            <div className="bg-[#111827] border border-indigo-500/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                  <Send className="w-4 h-4" /> New Announcement
                </h3>
                <button onClick={() => setShowNewAnnouncement(false)} className="text-gray-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input value={annTitle} onChange={e => setAnnTitle(e.target.value)}
                placeholder="Announcement title..."
                className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/40 placeholder:text-gray-600"
              />

              <textarea value={annMessage} onChange={e => setAnnMessage(e.target.value)}
                placeholder="Write your announcement message..."
                rows={4}
                className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl px-4 py-3 text-sm text-white outline-none resize-none focus:border-indigo-500/40 placeholder:text-gray-600"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Priority</label>
                  <select value={annPriority} onChange={e => setAnnPriority(e.target.value)}
                    className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-lg px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Category</label>
                  <select value={annCategory} onChange={e => setAnnCategory(e.target.value)}
                    className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-lg px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="general">General</option>
                    <option value="safety">Safety</option>
                    <option value="advisory">Advisory</option>
                    <option value="traffic">Traffic</option>
                    <option value="festival">Festival</option>
                    <option value="weather">Weather</option>
                    <option value="curfew">Curfew</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <button onClick={handleCreateAnnouncement} disabled={processing || !annTitle || !annMessage}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-indigo-500 text-white rounded-xl py-3 hover:bg-indigo-600 transition-colors disabled:opacity-50"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Publish Announcement
              </button>
            </div>
          )}

          {/* Announcements List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
            </div>
          ) : announcements.filter(a => a.is_active).length === 0 ? (
            <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl py-16 text-center">
              <Globe className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No active announcements</p>
              <p className="text-[11px] text-gray-600 mt-1">Create one to communicate with citizens</p>
            </div>
          ) : (
            announcements.filter(a => a.is_active).map(ann => (
              <div key={ann.id} className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5 hover:border-[#2A3A52] transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CATEGORY_ICONS[ann.category] || '📢'}</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{ann.title}</h4>
                      <p className="text-[10px] text-gray-500">
                        {new Date(ann.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${PRIORITY_COLORS[ann.priority]}`}>
                      {ann.priority.toUpperCase()}
                    </span>
                    <button onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-[13px] text-gray-300 leading-relaxed">{ann.message}</p>
                <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-600">
                  <span className="capitalize bg-[#0D1420] px-2 py-0.5 rounded">{ann.category}</span>
                  {ann.expires_at && (
                    <span>Expires: {new Date(ann.expires_at).toLocaleDateString('en-IN')}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Stats Tab */
        <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6">
          {stationStats ? (
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-white">Detailed Station Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Total Cases', value: stationStats.total_cases, desc: 'Cases received this month' },
                  { label: 'Cases Solved', value: stationStats.cases_solved, desc: 'Successfully resolved' },
                  { label: 'Cases Pending', value: stationStats.cases_pending, desc: 'Currently under investigation' },
                  { label: 'FIRs Registered', value: stationStats.fir_registered || 0, desc: 'FIRs registered this month' },
                  { label: 'Arrests Made', value: stationStats.arrests_made || 0, desc: 'Total arrests this month' },
                  { label: 'Conviction Rate', value: stationStats.conviction_count || 0, desc: 'Court convictions' },
                  { label: 'Avg Response (min)', value: stationStats.avg_response_time_mins || 0, desc: 'Average response time' },
                  { label: 'Patrol Hours', value: stationStats.patrol_hours || 0, desc: 'Total patrol hours logged' },
                  { label: 'Safety Score', value: `${stationStats.safety_score || 0}/100`, desc: 'Overall area safety rating' },
                ].map(s => (
                  <div key={s.label} className="bg-[#0D1420] rounded-xl p-4 border border-[#1F2D42]/50">
                    <p className="text-2xl font-heading font-bold text-white mb-1">{s.value}</p>
                    <p className="text-xs text-white font-medium">{s.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <BarChart3 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No statistics available yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
