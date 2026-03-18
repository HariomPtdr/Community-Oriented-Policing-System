'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Shield, Menu, X, LogOut, Bell,
  LayoutDashboard, FileText, FolderOpen, AlertTriangle,
  MessageCircle, Users, Siren, Clipboard, Map,
  Send, Radio, Calendar, UserCircle, BarChart3,
  Building2, Scale, Timer, Star, BookOpen, Settings,
  ChevronDown, Check, Eye, Briefcase, Megaphone,
  ArrowUpRight, GalleryVerticalEnd, Radar, Package,
  MapPin, Activity, ChevronRight, Sparkles, HelpCircle
} from 'lucide-react'
import { RankBadge } from '@/components/shared/RankBadge'
import type { UserRole } from '@/lib/types'
import { signOut } from '@/lib/auth/login'
import { createClient } from '@/lib/supabase/client'
import SOSFloatingButton from '@/components/sos/SOSFloatingButton'

/* ── Lucide Icon Map ────────────────────────────────────── */
const ICON_MAP: Record<string, React.ElementType> = {
  'dashboard':    LayoutDashboard,
  'file-report':  FileText,
  'my-reports':   FolderOpen,
  'alerts':       AlertTriangle,
  'forum':        MessageCircle,
  'officers':     Users,
  'sos':          Siren,
  'complaints':   Clipboard,
  'profile':      UserCircle,
  'cases':        Briefcase,
  'beat-map':     Map,
  'messages':     Send,
  'patrol-log':   Radio,
  'events':       Calendar,
  'constables':   Users,
  'investigation':Eye,
  'analytics':    BarChart3,
  'beats':        Map,
  'surveys':      GalleryVerticalEnd,
  'stations':     Building2,
  'directives':   BookOpen,
  'escalations':  ArrowUpRight,
  'users':        Users,
  'zones':        Map,
  'audit-log':    BookOpen,
  'system':       Settings,
  'use-of-force': Scale,
  'response-times': Timer,
  'officer-feedback': Star,
  'findings':     Clipboard,
  'track-report': Radar,
  'lost-found':   Package,
}

function getIcon(iconKey: string): React.ElementType {
  return ICON_MAP[iconKey] || LayoutDashboard
}

/* ── Nav structure with icon keys ────────────────────────── */
type NavItem = { href: string; label: string; iconKey: string }

const NAV_ITEMS: Record<string, NavItem[]> = {
  citizen: [
    { href: '/citizen/dashboard', label: 'Dashboard', iconKey: 'dashboard' },
    { href: '/citizen/report', label: 'File Report', iconKey: 'file-report' },
    { href: '/citizen/my-reports', label: 'My Reports', iconKey: 'my-reports' },
    { href: '/citizen/alerts', label: 'Alerts', iconKey: 'alerts' },
    { href: '/citizen/lost-found', label: 'Lost & Found', iconKey: 'lost-found' },
    { href: '/citizen/forum', label: 'Forum', iconKey: 'forum' },
  ],

  constable: [
    { href: '/officer/constable/dashboard', label: 'Dashboard', iconKey: 'dashboard' },
    { href: '/officer/constable/cases', label: 'Cases', iconKey: 'cases' },
    { href: '/officer/constable/beat-map', label: 'Beat Map', iconKey: 'beat-map' },
    { href: '/officer/constable/messages', label: 'Messages', iconKey: 'messages' },
    { href: '/officer/constable/patrol-log', label: 'Patrol Log', iconKey: 'patrol-log' },
    { href: '/officer/constable/events', label: 'Events', iconKey: 'events' },
    { href: '/officer/constable/profile', label: 'Profile', iconKey: 'profile' },
  ],
  si: [
    { href: '/officer/si/dashboard', label: 'Dashboard', iconKey: 'dashboard' },
    { href: '/officer/si/cases', label: 'Cases', iconKey: 'cases' },
    { href: '/officer/si/constables', label: 'Constables', iconKey: 'constables' },
    { href: '/officer/si/beat-map', label: 'Beat Map', iconKey: 'beat-map' },
    { href: '/officer/si/investigation', label: 'Investigation', iconKey: 'investigation' },
    { href: '/officer/si/messages', label: 'Messages', iconKey: 'messages' },
    { href: '/officer/si/analytics', label: 'Analytics', iconKey: 'analytics' },
    { href: '/officer/si/events', label: 'Events', iconKey: 'events' },
  ],
  sho: [
    { href: '/officer/sho/dashboard', label: 'Command Center', iconKey: 'dashboard' },
    { href: '/officer/sho/complaints', label: 'Complaints Queue', iconKey: 'complaints' },
    { href: '/officer/sho/cases', label: 'FIR Management', iconKey: 'cases' },
    { href: '/officer/sho/patrol', label: 'Patrol Oversight', iconKey: 'beats' },
    { href: '/officer/sho/transparency', label: 'Transparency', iconKey: 'analytics' },
    { href: '/officer/sho/sos', label: 'SOS Command', iconKey: 'sos' },
    { href: '/officer/sho/integrity', label: 'Integrity', iconKey: 'surveys' },
    { href: '/officer/sho/officers', label: 'Officers', iconKey: 'officers' },
    { href: '/officer/sho/court', label: 'Court Schedule', iconKey: 'events' },
    { href: '/officer/sho/notices', label: 'Dept. Notices', iconKey: 'directives' },
  ],
  dsp: [
    { href: '/officer/dsp/dashboard', label: 'Dashboard', iconKey: 'dashboard' },
    { href: '/officer/dsp/analytics', label: 'Analytics', iconKey: 'analytics' },
    { href: '/officer/dsp/stations', label: 'Stations', iconKey: 'stations' },
    { href: '/officer/dsp/complaints', label: 'Complaints', iconKey: 'complaints' },
    { href: '/officer/dsp/directives', label: 'Directives', iconKey: 'directives' },
    { href: '/officer/dsp/alerts', label: 'Alerts', iconKey: 'alerts' },
    { href: '/officer/dsp/escalations', label: 'Escalations', iconKey: 'escalations' },
  ],
  admin: [
    { href: '/admin/dashboard', label: 'Dashboard', iconKey: 'dashboard' },
    { href: '/admin/users', label: 'Users', iconKey: 'users' },
    { href: '/admin/zones', label: 'Zones', iconKey: 'zones' },
    { href: '/admin/stations', label: 'Stations', iconKey: 'stations' },
    { href: '/admin/analytics', label: 'Analytics', iconKey: 'analytics' },
    { href: '/admin/complaints', label: 'Complaints', iconKey: 'complaints' },
    { href: '/admin/audit-log', label: 'Audit Log', iconKey: 'audit-log' },
    { href: '/admin/system', label: 'System', iconKey: 'system' },
  ],
  oversight: [
    { href: '/oversight/dashboard', label: 'Dashboard', iconKey: 'dashboard' },
    { href: '/oversight/complaints', label: 'Complaints', iconKey: 'complaints' },
    { href: '/oversight/use-of-force', label: 'Use of Force', iconKey: 'use-of-force' },
    { href: '/oversight/response-times', label: 'Response Times', iconKey: 'response-times' },
    { href: '/oversight/officer-feedback', label: 'Officer Feedback', iconKey: 'officer-feedback' },
    { href: '/oversight/audit-log', label: 'Audit Log', iconKey: 'audit-log' },
    { href: '/oversight/findings', label: 'Findings', iconKey: 'findings' },
  ],
}



type Props = {
  role: UserRole
  userName?: string
  children: React.ReactNode
}

export function AppShell({ role, userName = 'User', children }: Props) {
  const [hovered, setHovered] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)


  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()
  const router = useRouter()
  const navItems = NAV_ITEMS[role] || NAV_ITEMS.citizen

  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // Desktop sidebar: collapsed by default, expands on hover
  const isExpanded = hovered

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {

      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Fetch notifications from Supabase
  useEffect(() => {
    const fetchNotifications = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setNotifications(data || [])
      const unread = (data || []).filter((n: any) => !n.is_read).length
      setUnreadCount(unread)

      // Realtime subscription
      const channel = supabase
        .channel('notif-shell')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          setNotifications(prev => [payload.new as any, ...prev.slice(0, 9)])
          setUnreadCount(prev => prev + 1)
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    fetchNotifications()
  }, [])

  // Mark notification as read
  const markAsRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }



  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const profileHref = role === 'citizen' ? '/citizen/profile' :
    role === 'admin' ? '/admin/profile' :
    role === 'oversight' ? '/oversight/profile' :
    `/officer/${role}/profile`

  /* ── Sidebar Content ─────────────────────────────────── */
  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => {
    const expanded = mobile || isExpanded
    return (
      <>
        {/* Logo */}
        <div className={`h-16 flex items-center border-b border-[#1F2D42] flex-shrink-0 ${expanded ? 'px-4 gap-3' : 'px-0 justify-center'}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {expanded && (
            <div className="min-w-0">
              <p className="font-heading font-bold text-white text-sm tracking-wide">COPS</p>
              <p className="text-[9px] text-gray-500 -mt-0.5">Community Oriented Police</p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const IconComp = getIcon(item.iconKey)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={!expanded ? item.label : undefined}
                className={`group flex items-center rounded-xl text-[13px] transition-all duration-200 relative ${
                  expanded ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5 mx-auto w-10'
                } ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-400 font-semibold'
                    : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-orange-500 rounded-r-full" />}
                <IconComp className={`flex-shrink-0 transition-colors ${isActive ? 'text-orange-400' : 'text-gray-500 group-hover:text-gray-300'} ${expanded ? 'w-[18px] h-[18px]' : 'w-5 h-5'}`} />
                {expanded && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* SOS Settings for citizens */}
        {role === 'citizen' && (
          <div className={`border-t border-[#1F2D42] ${expanded ? 'px-3 py-3' : 'px-1.5 py-3'}`}>
            <Link href="/citizen/sos"
              className={`group flex items-center justify-center rounded-xl bg-red-950/60 border border-red-800/50 hover:border-red-600 hover:bg-red-900/40 transition-all ${
                expanded ? 'gap-2 px-4 py-3' : 'w-10 h-10 mx-auto'
              }`}
            >
              <Siren className="w-5 h-5 text-red-400 group-hover:text-red-300 animate-pulse" />
              {expanded && <span className="text-red-400 font-bold text-sm group-hover:text-red-300">SOS Settings</span>}
            </Link>
          </div>
        )}

        {/* Sign out */}
        <div className={`border-t border-[#1F2D42] flex-shrink-0 ${expanded ? 'p-3' : 'p-2'}`}>
          {expanded ? (
            <button onClick={signOut} className="flex items-center gap-2 text-gray-500 hover:text-red-400 text-xs transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-red-500/5">
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button onClick={signOut} title="Sign Out"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-colors mx-auto">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex">
      {/* Desktop sidebar — auto-collapse, expand on hover */}
      <aside
        className={`hidden md:flex flex-col bg-[#0D1420] border-r border-[#1F2D42] flex-shrink-0 fixed top-0 left-0 bottom-0 z-40 transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-56' : 'w-[60px]'
        }`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <SidebarContent />
      </aside>

      {/* Spacer for sidebar */}
      <div className={`hidden md:block flex-shrink-0 transition-all duration-300 ${isExpanded ? 'w-56' : 'w-[60px]'}`} />

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#0D1420] border-r border-[#1F2D42] flex flex-col animate-slide-in">
            <SidebarContent mobile />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Top navbar ──────────────────────────────────── */}
        <header className="h-[56px] bg-[#0B0F1A]/98 backdrop-blur-2xl border-b border-[#1A2538] flex items-center px-4 lg:px-6 gap-3 flex-shrink-0 sticky top-0 z-30">
          {/* Mobile menu */}
          <button onClick={() => setMobileOpen(true)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-[#111827]/80 border border-[#1F2D42] text-gray-400 hover:text-white hover:border-orange-500/30 transition-all">
            <Menu className="w-5 h-5" />
          </button>

          {/* Spacer — pushes right section to far right */}
          <div className="flex-1" />

          {/* Right section */}
          <div className="flex items-center gap-1.5 md:gap-2.5">



            {/* ── Notifications ────────────────── */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }}
                className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 ${
                  notifOpen
                    ? 'bg-[#1A2538] border border-orange-500/30'
                    : 'hover:bg-[#111827] border border-transparent hover:border-[#1F2D42]'
                }`}
              >
                <Bell className={`w-[18px] h-[18px] transition-colors ${notifOpen ? 'text-orange-400' : 'text-gray-400 hover:text-white'}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-orange-500 rounded-full flex items-center justify-center text-[9px] font-bold text-black border-2 border-[#0B0F1A] px-1 shadow-lg shadow-orange-500/30">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute top-full right-0 mt-2 w-96 bg-[#111827] border border-[#1F2D42] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1F2D42]">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-orange-400" />
                      <h3 className="text-sm font-semibold text-white">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-semibold">{unreadCount} new</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[11px] text-gray-400 hover:text-orange-400 transition-colors font-medium">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[380px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-[#0D1420] border border-[#1F2D42] flex items-center justify-center mx-auto mb-3">
                          <Bell className="w-5 h-5 text-gray-600" />
                        </div>
                        <p className="text-sm text-gray-400 font-medium">All caught up!</p>
                        <p className="text-[11px] text-gray-600 mt-0.5">No new notifications</p>
                      </div>
                    ) : (
                      notifications.map((n, i) => (
                        <div key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`px-5 py-3.5 hover:bg-white/[0.02] cursor-pointer transition-colors ${
                            !n.is_read ? 'bg-orange-500/[0.04] border-l-2 border-orange-500' : 'border-l-2 border-transparent'
                          } ${i < notifications.length - 1 ? 'border-b border-b-[#1F2D42]/40' : ''}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              !n.is_read ? 'bg-orange-500/10' : 'bg-[#0D1420]'
                            }`}>
                              <Bell className={`w-3.5 h-3.5 ${!n.is_read ? 'text-orange-400' : 'text-gray-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[13px] leading-tight ${!n.is_read ? 'text-white font-medium' : 'text-gray-400'}`}>{n.title}</p>
                              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                              <p className="text-[10px] text-gray-600 mt-1.5">{timeAgo(n.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="px-5 py-2.5 border-t border-[#1F2D42] bg-[#0D1420]/50">
                      <button className="text-[11px] text-orange-400 hover:text-orange-300 w-full text-center font-medium transition-colors flex items-center justify-center gap-1">
                        View all notifications <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Divider ─────────────────────── */}
            <div className="hidden sm:block w-px h-6 bg-[#1F2D42] mx-1" />

            {/* ── Area Safety ─────────────────── */}
            {role === 'citizen' && (
              <div className="hidden sm:flex items-center gap-1.5 bg-green-500/8 border border-green-500/15 px-3 py-1.5 rounded-full cursor-default group">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-60" />
                </div>
                <span className="text-[11px] text-green-400 font-semibold tracking-wide">Area Safe</span>
              </div>
            )}

            {/* ── Profile ─────────────────────── */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
                className={`flex items-center gap-2.5 h-9 rounded-xl transition-all duration-200 pl-1 pr-2.5 ${
                  profileOpen
                    ? 'bg-[#1A2538] border border-orange-500/30'
                    : 'hover:bg-[#111827] border border-transparent hover:border-[#1F2D42]'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500/40 to-amber-600/40 border border-orange-500/30 flex items-center justify-center text-[11px] font-bold text-orange-400 shadow-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-[12px] text-white font-medium leading-tight">{userName.split(' ')[0]}</p>
                  <p className="text-[9px] text-gray-500 capitalize leading-tight">{role}</p>
                </div>
                <ChevronDown className={`w-3 h-3 text-gray-500 hidden lg:block transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-[#111827] border border-[#1F2D42] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* User card */}
                  <div className="px-4 py-4 border-b border-[#1F2D42] bg-gradient-to-r from-[#111827] to-[#131D2E]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/30 to-amber-600/30 border border-orange-500/30 flex items-center justify-center text-sm font-bold text-orange-400">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-white font-semibold">{userName}</p>
                        <RankBadge role={role} size="sm" />
                      </div>
                    </div>
                  </div>
                  {/* Quick actions */}
                  <div className="px-1.5 py-1.5">
                    <Link href={profileHref}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-gray-300 hover:bg-white/5 hover:text-white transition-all">
                      <UserCircle className="w-4 h-4 text-gray-500" />
                      My Profile
                    </Link>
                    {role === 'citizen' && (
                      <Link href="/citizen/sos"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-gray-300 hover:bg-white/5 hover:text-white transition-all">
                        <Siren className="w-4 h-4 text-red-400" />
                        SOS Settings
                      </Link>
                    )}
                    <Link href={role === 'citizen' ? '/citizen/settings' : profileHref}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-gray-300 hover:bg-white/5 hover:text-white transition-all">
                      <Settings className="w-4 h-4 text-gray-500" />
                      Settings
                    </Link>
                    <Link href={role === 'citizen' ? '/citizen/help' : '#'}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-gray-300 hover:bg-white/5 hover:text-white transition-all">
                      <HelpCircle className="w-4 h-4 text-gray-500" />
                      Help & Support
                    </Link>
                  </div>
                  {/* Sign out */}
                  <div className="px-1.5 pb-1.5 pt-0 border-t border-[#1F2D42]">
                    <button onClick={signOut}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-red-400 hover:bg-red-500/10 transition-all w-full mt-1.5">
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>

        {/* Floating SOS Button — always accessible for citizens */}
        {role === 'citizen' && <SOSFloatingButton />}
      </div>
    </div>
  )
}
