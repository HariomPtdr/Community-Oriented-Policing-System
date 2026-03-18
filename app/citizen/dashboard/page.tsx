'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  CATEGORY_ICONS, STATUS_VISUAL, ALERT_TYPE_VISUAL,
  type Incident, type Alert
} from '@/lib/types'
import {
  FileText, Shield, Folder, MapPin, Bell, Clock,
  Upload, ChevronRight, AlertTriangle,
  Loader2, ChevronDown, ChevronUp, ExternalLink,
  TrendingUp, TrendingDown, Briefcase, CheckCircle2,
  Megaphone, ArrowUpRight, Star, Send,
  BarChart3, MessageCircle, X, ShieldCheck, Calendar,
  Activity, Search, Package
} from 'lucide-react'

/* ── status timeline config ─────────────────────────────── */
const TIMELINE_STEPS = [
  { key: 'submitted', label: 'Submitted', icon: '📋' },
  { key: 'under_review', label: 'Review', icon: '🔍' },
  { key: 'assigned', label: 'Assigned', icon: '👮' },
  { key: 'in_progress', label: 'In Progress', icon: '⚡' },
  { key: 'resolved', label: 'Resolved', icon: '✅' },
  { key: 'closed', label: 'Closed', icon: '🔒' },
] as const

function getStepIndex(status: string): number {
  const idx = TIMELINE_STEPS.findIndex(s => s.key === status)
  return idx === -1 ? 0 : idx
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const ANNOUNCEMENT_ICONS: Record<string, string> = {
  general: '📢', safety: '🛡️', advisory: '⚠️', traffic: '🚗',
  festival: '🎉', weather: '🌧️', curfew: '🚨', other: '📌',
}

const ANNOUNCEMENT_PRIORITY_COLORS: Record<string, string> = {
  urgent: 'border-l-red-500 bg-red-500/5',
  high: 'border-l-orange-500 bg-orange-500/5',
  normal: 'border-l-blue-500 bg-blue-500/5',
  low: 'border-l-gray-500 bg-gray-500/5',
}

type MonthlyStats = {
  total_cases: number; cases_solved: number; cases_pending: number
  fir_registered: number; arrests_made: number; avg_response_time_mins: number
  safety_score: number; crime_rate_change: number; top_crime_category: string | null
}

type Announcement = {
  id: string; title: string; message: string; priority: string
  category: string; created_at: string
}

type ChatRoom = {
  id: string; incident_id: string; citizen_id: string; officer_id: string | null
  status: string; last_message_at: string
  incidents?: { title: string; id: string }
}

type ChatMessage = {
  id: string; room_id: string; sender_id: string; content: string
  message_type: string; is_read: boolean; created_at: string
}

/* ── main component ──────────────────────────────────────── */
export default function CitizenDashboard() {
  const supabase = createClient()
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('User')
  const [neighborhoodName, setNeighborhoodName] = useState('Your Area')

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null)
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  /* chat state */
  const [activeChatRoom, setActiveChatRoom] = useState<ChatRoom | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [greeting, setGreeting] = useState('☀️ Namaskar')
  const [expandedReport, setExpandedReport] = useState<string | null>(null)
  const [reportFilter, setReportFilter] = useState<'all' | 'active' | 'resolved'>('all')
  const [trackSearch, setTrackSearch] = useState('')

  const handleTrack = () => {
    if (!trackSearch.trim()) return
    router.push(`/citizen/my-reports?search=${encodeURIComponent(trackSearch.trim())}`)
  }


  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 5 && h < 12) setGreeting('🌅 Welcome')
    else if (h >= 12 && h < 17) setGreeting('☀️ Welcome')
    else if (h >= 17 && h < 21) setGreeting('🌆 Welcome')
    else setGreeting('🌙 Welcome')
  }, [])

  /* ── fetch all data ────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles').select('full_name, neighborhood_id')
      .eq('id', user.id).single()
    if (profile) setUserName(profile.full_name || 'User')

    if (profile?.neighborhood_id) {
      const { data: nbr } = await supabase
        .from('neighborhoods').select('name')
        .eq('id', profile.neighborhood_id).single()
      if (nbr) setNeighborhoodName(nbr.name)
    }

    const { data: myIncidents } = await supabase
      .from('incidents').select('*')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false }).limit(20)
    setIncidents((myIncidents as Incident[]) || [])

    const { data: activeAlerts } = await supabase
      .from('alerts').select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false }).limit(10)
    setAlerts((activeAlerts as Alert[]) || [])

    const { data: shoMessages } = await supabase
      .from('sho_announcements').select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false }).limit(10)
    setAnnouncements((shoMessages as Announcement[]) || [])

    const now = new Date()
    const { data: stats } = await supabase
      .from('monthly_police_stats').select('*')
      .eq('month', now.getMonth() + 1).eq('year', now.getFullYear())
      .limit(1).maybeSingle()
    setMonthlyStats(stats as MonthlyStats | null)

    /* chat rooms */
    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select('*, incidents(title, id)')
      .eq('citizen_id', user.id)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false })
      .limit(10)
    setChatRooms((rooms as ChatRoom[]) || [])

    const { count } = await supabase
      .from('notifications').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('is_read', false)
    setUnreadCount(count || 0)

    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  /* ── realtime ──────────────────────────────────────────── */
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('citizen-dashboard-v2')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'incidents',
        filter: `reporter_id=eq.${userId}`,
      }, () => fetchData())
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'alerts',
      }, (payload) => setAlerts(prev => [payload.new as Alert, ...prev]))
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'sho_announcements',
      }, (payload) => setAnnouncements(prev => [payload.new as Announcement, ...prev]))
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => setUnreadCount(prev => prev + 1))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, fetchData])

  /* ── chat: open room + load messages ───────────────────── */
  const openChatRoom = async (room: ChatRoom) => {
    setActiveChatRoom(room)
    setChatLoading(true)
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: true })
      .limit(100)
    setChatMessages((data as ChatMessage[]) || [])
    setChatLoading(false)

    // Mark messages as read
    if (userId) {
      await supabase.from('chat_messages')
        .update({ is_read: true })
        .eq('room_id', room.id)
        .neq('sender_id', userId)
    }

    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  /* ── chat: send message ────────────────────────────────── */
  const sendMessage = async () => {
    if (!chatInput.trim() || !activeChatRoom || !userId) return
    const msg = chatInput.trim()
    setChatInput('')

    const { data, error } = await supabase.from('chat_messages').insert({
      room_id: activeChatRoom.id,
      sender_id: userId,
      content: msg,
      message_type: 'text',
    }).select().single()

    if (data) {
      setChatMessages(prev => [...prev, data as ChatMessage])
      await supabase.from('chat_rooms')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeChatRoom.id)
    }
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  /* ── chat: realtime messages ───────────────────────────── */
  useEffect(() => {
    if (!activeChatRoom) return
    const channel = supabase
      .channel(`chat-${activeChatRoom.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `room_id=eq.${activeChatRoom.id}`,
      }, (payload) => {
        const newMsg = payload.new as ChatMessage
        if (newMsg.sender_id !== userId) {
          setChatMessages(prev => [...prev, newMsg])
          supabase.from('chat_messages').update({ is_read: true }).eq('id', newMsg.id)
        }
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeChatRoom, userId])

  /* ── derived stats ─────────────────────────────────────── */
  const totalReports = incidents.length
  const activeReports = incidents.filter(i =>
    ['submitted', 'under_review', 'assigned', 'in_progress'].includes(i.status)
  )
  const resolvedReports = incidents.filter(i =>
    ['resolved', 'closed'].includes(i.status)
  )
  const filteredReports = reportFilter === 'all'
    ? incidents : reportFilter === 'active' ? activeReports : resolvedReports

  const firstName = userName.split(' ')[0] || 'User'

  const statsData = monthlyStats || {
    total_cases: totalReports, cases_solved: resolvedReports.length,
    cases_pending: activeReports.length, fir_registered: totalReports,
    arrests_made: 0, avg_response_time_mins: 8, safety_score: 78,
    crime_rate_change: -5.2, top_crime_category: 'theft',
  }

  const resolutionRate = statsData.total_cases > 0
    ? Math.round((statsData.cases_solved / statsData.total_cases) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24 md:pb-6 relative">

      {/* ══════════════════════ GREETING ═══════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 relative">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-gray-500 text-[10px] uppercase font-bold tracking-[0.2em]">
            <Calendar className="w-3.5 h-3.5 text-orange-500/70" />
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white font-heading tracking-tight leading-tight">
            {greeting.split(' ')[0]} <span className="bg-gradient-to-r from-orange-400 via-amber-200 to-white bg-clip-text text-transparent">{greeting.split(' ')[1]}</span>, {firstName}!
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-500 ${
              activeReports.length > 0 
                ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' 
                : 'bg-green-500/10 border-green-500/20 text-green-400'
            }`}>
              <div className="relative">
                <div className={`w-2 h-2 rounded-full ${activeReports.length > 0 ? 'bg-orange-500' : 'bg-green-500'}`} />
                {activeReports.length > 0 && (
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-orange-500 animate-ping opacity-75" />
                )}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">
                {activeReports.length === 0 ? 'All Systems Clear' : `${activeReports.length} Reports Processing`}
              </span>
            </div>
            
            <div className="h-4 w-px bg-gray-800" />
            
            <div className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors cursor-default">
              <MapPin className="w-3.5 h-3.5 text-blue-500/70" />
              <span className="text-xs font-medium">{neighborhoodName} Sector</span>
            </div>
          </div>
        </div>

        {/* Security Status Box */}
        <div className="flex items-center gap-4 bg-gradient-to-br from-[#111827] to-[#0D1420] border border-[#1F2D42] rounded-3xl p-4 pr-6 shadow-2xl shadow-black/40 group hover:border-[#2a3a52] transition-all">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1 group-hover:text-blue-400 transition-colors">Digital Shield</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Status: </span>
              <span className="text-xs font-bold text-green-400 flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> Guarded
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/5 border border-green-500/20 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
            <Shield className="w-6 h-6 text-green-400 filter drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
          </div>
        </div>

        {/* Subtle background glow */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-orange-500/5 rounded-full blur-[80px] -z-10" />
      </div>

      {/* ══════════════════════ HERO — 3 BOXES ═══════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {/* ────── BOX 1: Monthly Police Data Report ────── */}
        <div className="bg-gradient-to-br from-[#111827] to-[#0F1A2E] border border-[#1F2D42] rounded-2xl overflow-hidden shadow-lg shadow-black/20">
          <div className="px-5 py-3 border-b border-[#1F2D42]/60 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" /> Monthly Police Report
            </h2>
            <span className="text-[10px] text-gray-500 font-mono bg-[#0D1420] px-2 py-0.5 rounded-lg">
              {new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="p-4 space-y-3">
            {/* Resolution highlight */}
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/5 border border-blue-500/15 rounded-xl">
              <div className="w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-xl font-bold text-white font-mono leading-none">{resolutionRate}%</p>
                <p className="text-[10px] text-blue-400/80 font-medium mt-0.5">Cases Resolved</p>
              </div>
              {statsData.crime_rate_change < 0 ? (
                <div className="flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/15">
                  <TrendingDown className="w-3 h-3 text-green-400" />
                  <span className="text-[10px] text-green-400 font-bold">{Math.abs(statsData.crime_rate_change)}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/15">
                  <TrendingUp className="w-3 h-3 text-red-400" />
                  <span className="text-[10px] text-red-400 font-bold">+{statsData.crime_rate_change}%</span>
                </div>
              )}
            </div>

            {/* 3-col stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: statsData.total_cases, label: 'Total Cases', color: 'text-orange-400' },
                { val: statsData.cases_solved, label: 'Solved', color: 'text-green-400' },
                { val: statsData.cases_pending, label: 'Pending', color: 'text-amber-400' },
              ].map(s => (
                <div key={s.label} className="bg-[#0D1420] rounded-xl p-2.5 text-center border border-[#1F2D42]/40">
                  <p className={`text-lg font-bold font-mono ${s.color}`}>{s.val}</p>
                  <p className="text-[9px] text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* 2-col extra stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 bg-[#0D1420] rounded-xl p-2.5 border border-[#1F2D42]/40">
                <Briefcase className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-white font-mono">{statsData.fir_registered}</p>
                  <p className="text-[9px] text-gray-500">FIR Registered</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-[#0D1420] rounded-xl p-2.5 border border-[#1F2D42]/40">
                <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-white font-mono">{statsData.avg_response_time_mins}m</p>
                  <p className="text-[9px] text-gray-500">Avg Response</p>
                </div>
              </div>
            </div>

            {/* Safety bar */}
            <div className="bg-[#0D1420] rounded-xl p-3 border border-[#1F2D42]/40">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-400">Safety Score</span>
                <span className="text-sm font-bold text-white font-mono">{statsData.safety_score}/100</span>
              </div>
              <div className="w-full h-1.5 bg-[#1F2D42] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${
                  statsData.safety_score >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                  statsData.safety_score >= 40 ? 'bg-gradient-to-r from-amber-500 to-orange-400' :
                  'bg-gradient-to-r from-red-500 to-red-400'
                }`} style={{ width: `${statsData.safety_score}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* ────── BOX 2: Area Alerts ────── */}
        <div className="bg-gradient-to-br from-[#111827] to-[#0F1A2E] border border-[#1F2D42] rounded-2xl overflow-hidden shadow-lg shadow-black/20">
          <div className="px-5 py-3 border-b border-[#1F2D42]/60 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" /> Area Alerts
              {alerts.length > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">{alerts.length}</span>
              )}
            </h2>
            <Link href="/citizen/alerts" className="text-[10px] text-orange-400 hover:underline flex items-center gap-1">
              View All <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-7 h-7 text-green-400" />
                </div>
                <p className="text-green-400 font-semibold text-sm">All Clear!</p>
                <p className="text-xs text-gray-500 mt-1">No active alerts in {neighborhoodName}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">Routine patrolling is active</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                {alerts.slice(0, 6).map(alert => {
                  const vis = ALERT_TYPE_VISUAL[alert.type] || ALERT_TYPE_VISUAL.safety_advisory
                  const borderColors: Record<string, string> = {
                    crime_alert: 'border-l-red-500 bg-red-500/5',
                    missing_person: 'border-l-amber-500 bg-amber-500/5',
                    wanted_notice: 'border-l-purple-500 bg-purple-500/5',
                    safety_advisory: 'border-l-blue-500 bg-blue-500/5',
                    sos: 'border-l-red-600 bg-red-600/5',
                  }
                  return (
                    <div key={alert.id}
                      className={`border-l-[3px] rounded-xl p-3 ${borderColors[alert.type] || 'border-l-blue-500 bg-blue-500/5'} hover:brightness-110 transition-all cursor-pointer`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${vis.bg} ${vis.color}`}>
                          {vis.icon} {vis.label}
                        </span>
                        <span className="text-[9px] text-gray-500">{timeAgo(alert.created_at)}</span>
                      </div>
                      <h3 className="text-white font-medium text-[13px] leading-snug">{alert.title}</h3>
                      {alert.description && (
                        <p className="text-gray-400 text-[11px] leading-relaxed mt-1 line-clamp-2">{alert.description}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ────── BOX 3: SHO Messages ────── */}
        <div className="bg-gradient-to-br from-[#111827] to-[#0F1A2E] border border-[#1F2D42] rounded-2xl overflow-hidden shadow-lg shadow-black/20">
          <div className="px-5 py-3 border-b border-[#1F2D42]/60 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-400" /> SHO Messages
              {announcements.length > 0 && (
                <span className="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{announcements.length}</span>
              )}
            </h2>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-green-400 font-medium">Live</span>
            </div>
          </div>
          <div className="p-4">
            {announcements.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
                  <Megaphone className="w-7 h-7 text-amber-400" />
                </div>
                <p className="text-amber-400 font-semibold text-sm">No Messages</p>
                <p className="text-xs text-gray-500 mt-1">No announcements from SHO</p>
                <p className="text-[10px] text-gray-600 mt-0.5">Messages from your local police appear here</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                {announcements.map(ann => (
                  <div key={ann.id}
                    className={`border-l-[3px] rounded-xl p-3 ${ANNOUNCEMENT_PRIORITY_COLORS[ann.priority] || ANNOUNCEMENT_PRIORITY_COLORS.normal} hover:brightness-110 transition-all`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        ann.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                        ann.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {ANNOUNCEMENT_ICONS[ann.category] || '📢'} {ann.priority === 'urgent' ? 'URGENT' : ann.priority === 'high' ? 'Important' : 'Notice'}
                      </span>
                      <span className="text-[9px] text-gray-500">{timeAgo(ann.created_at)}</span>
                    </div>
                    <h3 className="text-white font-medium text-[13px] leading-snug">{ann.title}</h3>
                    <p className="text-gray-400 text-[11px] leading-relaxed mt-1 line-clamp-2">{ann.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════ SEARCH / TRACK ═══════════════════════ */}
      <div className="mb-8 relative group">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative bg-[#111827] border border-[#1F2D42] rounded-[2rem] p-4 flex flex-col md:flex-row items-center gap-4 shadow-xl shadow-black/20 group-hover:border-orange-500/20 transition-all">
          <div className="flex items-center gap-4 flex-1 w-full">
            <div className="w-12 h-12 rounded-2xl bg-[#0D1420] border border-[#1F2D42] flex items-center justify-center text-orange-400">
              <Search className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">High-Speed Tracking</p>
              <input 
                type="text"
                value={trackSearch}
                onChange={(e) => setTrackSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                placeholder="Enter Case ID or FIR Number to track status..."
                className="w-full bg-transparent border-none outline-none text-white text-lg font-bold placeholder:text-gray-700"
              />
            </div>
          </div>
          <button 
            onClick={handleTrack}
            className="w-full md:w-auto px-8 py-3.5 bg-orange-500 hover:bg-orange-400 text-black font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-orange-500/20">
            Track Report
          </button>
        </div>
      </div>

      {/* ══════════════════════ QUICK ACTIONS (4 essential) ═══════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Link href="/citizen/report"
          className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/10 rounded-2xl p-4 flex flex-col items-center text-center gap-2 hover:border-orange-500/40 hover:bg-orange-500/10 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/15 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <FileText className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <p className="text-xs text-white font-black uppercase tracking-widest">File Report</p>
            <p className="text-[9px] text-gray-500 font-medium">New Incident</p>
          </div>
        </Link>

        <Link href="/citizen/sos"
          className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/10 rounded-2xl p-4 flex flex-col items-center text-center gap-2 hover:border-red-500/40 hover:bg-red-500/10 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform animate-pulse">
            <Activity className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-red-500 font-black uppercase tracking-widest">Emergency</p>
            <p className="text-[9px] text-gray-500 font-medium">SOS Help</p>
          </div>
        </Link>

        <Link href="/citizen/my-reports"
          className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/10 rounded-2xl p-4 flex flex-col items-center text-center gap-2 hover:border-blue-500/40 hover:bg-blue-500/10 transition-all group relative">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Folder className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-white font-black uppercase tracking-widest">Reports</p>
            <p className="text-[9px] text-gray-500 font-medium">{totalReports} filed</p>
          </div>
          {activeReports.length > 0 && (
            <div className="absolute top-2 right-2 bg-orange-500 text-black text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-4 border-[#0D1420]">{activeReports.length}</div>
          )}
        </Link>

        <Link href="/citizen/lost-found"
          className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/10 rounded-2xl p-4 flex flex-col items-center text-center gap-2 hover:border-purple-500/40 hover:bg-purple-500/10 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Package className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-white font-black uppercase tracking-widest">Lost/Found</p>
            <p className="text-[9px] text-gray-500 font-medium">Item Recovery</p>
          </div>
        </Link>


      </div>

      {/* ══════════════════════ MAIN GRID: Reports + Chat ═══════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── LEFT COL: My Reports (scrollable, 3/5 width) ──────── */}
        <div className="lg:col-span-3">
          <section className="bg-gradient-to-br from-[#111827] to-[#0F1A2E] border border-[#1F2D42] rounded-3xl overflow-hidden shadow-lg shadow-black/20">
            <div className="px-5 py-4 border-b border-[#1F2D42]/60 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                <Folder className="w-4 h-4 text-orange-400" /> Status Tracking
              </h2>
              <div className="flex items-center gap-1.5">
                {(['all', 'active', 'resolved'] as const).map(f => (
                  <button key={f} onClick={() => setReportFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      reportFilter === f
                        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                        : 'text-gray-500 hover:text-white hover:bg-[#1A2235]'
                    }`}>
                    {f === 'all' ? `All (${totalReports})` : f === 'active' ? `Active (${activeReports.length})` : `Done (${resolvedReports.length})`}
                  </button>
                ))}
                <Link href="/citizen/report"
                  className="bg-orange-500 hover:bg-orange-400 text-black text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ml-1">
                  <FileText className="w-3 h-3" /> New
                </Link>
              </div>
            </div>

            {/* SCROLLABLE report list */}
            <div className="max-h-[520px] overflow-y-auto custom-scrollbar">
              <div className="p-4">
                {filteredReports.length === 0 ? (
                  <EmptyState
                    icon="📋"
                    title={reportFilter === 'all' ? 'No reports yet' : `No ${reportFilter} reports`}
                    description={reportFilter === 'all'
                      ? 'When you file a report, its real-time status appears here.'
                      : `You don't have any ${reportFilter} reports right now.`}
                    action={
                      reportFilter === 'all' ? (
                        <Link href="/citizen/report"
                          className="bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors">
                          📋 File Your First Report
                        </Link>
                      ) : undefined
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {filteredReports.map(report => {
                      const stepIdx = getStepIndex(report.status)
                      const statusConf = STATUS_VISUAL[report.status] || STATUS_VISUAL.submitted
                      const isExpanded = expandedReport === report.id

                      return (
                        <div key={report.id}
                          className="bg-[#0D1420] border border-[#1F2D42]/60 rounded-xl overflow-hidden hover:border-[#2a3a52] transition-colors">
                          <div className="p-3.5 cursor-pointer group" onClick={() => router.push(`/citizen/my-reports/${report.id}`)}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                  <span className="text-[10px] font-mono text-amber-400/80">{report.id.slice(0, 8).toUpperCase()}</span>
                                  <span className="text-sm">{CATEGORY_ICONS[report.category] || '📋'}</span>
                                </div>
                                <h3 className="text-[13px] text-white font-medium leading-snug truncate group-hover:text-orange-400 transition-colors">{report.title}</h3>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <StatusBadge status={report.status} />
                                <PriorityBadge priority={report.priority} />
                              </div>
                            </div>

                            {/* Compact timeline */}
                            <div className="flex items-center w-full gap-0">
                              {TIMELINE_STEPS.map((step, i) => {
                                const isDone = i <= stepIdx
                                const isCurrent = i === stepIdx
                                return (
                                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                                    <div className={`flex-shrink-0 rounded-full transition-all ${
                                      isCurrent ? `w-4 h-4 ${statusConf.bg} border ${statusConf.text.replace('text-', 'border-')} flex items-center justify-center`
                                      : isDone ? 'w-2 h-2 bg-orange-500'
                                      : 'w-2 h-2 bg-[#1F2D42]'
                                    }`}>
                                      {isCurrent && <div className={`w-1.5 h-1.5 rounded-full ${statusConf.dot} animate-pulse`} />}
                                    </div>
                                    {i < TIMELINE_STEPS.length - 1 && (
                                      <div className={`flex-1 h-px mx-0.5 ${i < stepIdx ? 'bg-orange-500' : 'bg-[#1F2D42]'}`} />
                                    )}
                                  </div>
                                )
                              })}
                            </div>

                            <div className="flex items-center justify-between mt-2">
                              <div className="flex gap-3 text-[10px] text-gray-500">
                                {report.location_description && (
                                  <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{report.location_description}</span>
                                )}
                                <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{timeAgo(report.created_at)}</span>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* ── RIGHT COL: Chat Room (2/5 width) ──────────── */}
        <div className="lg:col-span-2">
          <section className="bg-gradient-to-br from-[#111827] to-[#0F1A2E] border border-[#1F2D42] rounded-2xl overflow-hidden shadow-lg shadow-black/20 flex flex-col" style={{ height: '580px' }}>
            {/* Chat header */}
            <div className="px-5 py-3.5 border-b border-[#1F2D42]/60 flex items-center justify-between flex-shrink-0">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-blue-400" />
                {activeChatRoom ? (
                  <span className="truncate max-w-[180px]">
                    Chat — {(activeChatRoom.incidents as any)?.title || 'Case'}
                  </span>
                ) : 'Officer Chat'}
              </h2>
              {activeChatRoom && (
                <button onClick={() => { setActiveChatRoom(null); setChatMessages([]) }}
                  className="w-7 h-7 rounded-lg bg-[#0D1420] border border-[#1F2D42] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Chat body */}
            {!activeChatRoom ? (
              /* Room list */
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {chatRooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                      <MessageCircle className="w-8 h-8 text-blue-400" />
                    </div>
                    <p className="text-white font-semibold text-sm mb-1">Officer Chat</p>
                    <p className="text-gray-500 text-xs leading-relaxed">
                      When an officer is assigned to your report, you can chat with them here in real time.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                      End-to-end secure
                    </div>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold px-2 mb-2">Active Conversations</p>
                    {chatRooms.map(room => (
                      <button key={room.id} onClick={() => openChatRoom(room)}
                        className="w-full text-left p-3 bg-[#0D1420] border border-[#1F2D42]/40 rounded-xl hover:border-blue-500/30 hover:bg-blue-500/5 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-white font-medium truncate">
                              {(room.incidents as any)?.title || 'Case Chat'}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              Officer assigned • {timeAgo(room.last_message_at)}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Messages view */
              <>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 custom-scrollbar">
                  {chatLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <p className="text-gray-500 text-xs">No messages yet. Say hello!</p>
                    </div>
                  ) : (
                    chatMessages.map(msg => {
                      const isMe = msg.sender_id === userId
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed ${
                            isMe
                              ? 'bg-orange-500 text-black rounded-br-md'
                              : 'bg-[#1A2538] text-gray-200 border border-[#1F2D42] rounded-bl-md'
                          }`}>
                            <p>{msg.content}</p>
                            <p className={`text-[9px] mt-1 ${isMe ? 'text-orange-900' : 'text-gray-500'}`}>
                              {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Message input */}
                <div className="p-3 border-t border-[#1F2D42]/60 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <input
                      ref={chatInputRef}
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
                      placeholder="Type a message..."
                      className="flex-1 bg-[#0D1420] border border-[#1F2D42] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-orange-500/40 transition-colors"
                    />
                    <button onClick={sendMessage}
                      disabled={!chatInput.trim()}
                      className="w-10 h-10 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:bg-[#1F2D42] disabled:text-gray-600 text-black flex items-center justify-center transition-all active:scale-95">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {/* ══════════════════════ MOBILE SOS ══════════════════════ */}
      <div className="fixed bottom-20 right-5 md:hidden z-50">
        <Link href="/citizen/sos" className="block">
          <div className="w-16 h-16 rounded-full bg-red-600 shadow-lg shadow-red-900/50 flex items-center justify-center text-white font-bold text-xl active:scale-95 transition-transform border-2 border-red-400">
            🆘
          </div>
        </Link>
      </div>
    </div>
  )
}
