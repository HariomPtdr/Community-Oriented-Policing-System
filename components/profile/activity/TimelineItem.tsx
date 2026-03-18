'use client'

import Link from 'next/link'
import {
  CheckCircle, Pencil, Lock, Monitor, ShieldCheck, ShieldAlert,
  ClipboardList, RefreshCw, CheckCircle2, XCircle, Hash,
  Siren, AlertTriangle, X, MessageSquare,
  Bell, ArrowRight
} from 'lucide-react'
import type { ActivityEvent } from '@/lib/validations/activity'

const EVENT_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  account_created:       { icon: CheckCircle,    color: 'text-green-400',  bg: 'bg-green-500/10' },
  profile_updated:       { icon: Pencil,         color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  password_changed:      { icon: Lock,           color: 'text-gray-400',   bg: 'bg-gray-500/10' },
  login_new_device:      { icon: Monitor,        color: 'text-gray-400',   bg: 'bg-gray-500/10' },
  two_factor_enabled:    { icon: ShieldCheck,    color: 'text-green-400',  bg: 'bg-green-500/10' },
  two_factor_disabled:   { icon: ShieldAlert,    color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  report_filed:          { icon: ClipboardList,  color: 'text-orange-400', bg: 'bg-orange-500/10' },
  report_status_changed: { icon: RefreshCw,      color: 'text-orange-400', bg: 'bg-orange-500/10' },
  report_resolved:       { icon: CheckCircle2,   color: 'text-green-400',  bg: 'bg-green-500/10' },
  report_rejected:       { icon: XCircle,        color: 'text-red-400',    bg: 'bg-red-500/10' },
  fir_number_assigned:   { icon: Hash,           color: 'text-orange-400', bg: 'bg-orange-500/10' },
  sos_activated:         { icon: Siren,          color: 'text-red-400',    bg: 'bg-red-500/10' },
  sos_resolved:          { icon: ShieldCheck,    color: 'text-green-400',  bg: 'bg-green-500/10' },
  sos_false_alarm:       { icon: AlertTriangle,  color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  sos_cancelled:         { icon: X,              color: 'text-gray-400',   bg: 'bg-gray-500/10' },
  forum_post_published:  { icon: MessageSquare,  color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  forum_post_resolved:   { icon: CheckCircle2,   color: 'text-green-400',  bg: 'bg-green-500/10' },
  forum_comment_posted:  { icon: MessageSquare,  color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  forum_post_removed:    { icon: XCircle,        color: 'text-red-400',    bg: 'bg-red-500/10' },
  area_alert_received:   { icon: Bell,           color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  case_feedback_submitted: { icon: CheckCircle,  color: 'text-green-400',  bg: 'bg-green-500/10' },
}

const DEFAULT_CONFIG = { icon: CheckCircle, color: 'text-gray-400', bg: 'bg-gray-500/10' }

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`

  const thisYear = now.getFullYear() === date.getFullYear()
  if (thisYear) {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
      ' at ' + date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' at ' + date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function TimelineItem({ event }: { event: ActivityEvent }) {
  const config = EVENT_CONFIG[event.eventType] || DEFAULT_CONFIG
  const Icon = config.icon

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#1A2235] transition-colors group">
      {/* Icon */}
      <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm text-white font-medium leading-tight truncate">{event.title}</p>
            {event.subtitle && (
              <p className="text-[11px] text-gray-500 mt-0.5 truncate">{event.subtitle}</p>
            )}
          </div>
          <span className="text-[10px] text-gray-600 flex-shrink-0 mt-0.5"
            title={new Date(event.createdAt).toLocaleString('en-IN')}>
            {formatTimeAgo(event.createdAt)}
          </span>
        </div>

        {/* Action link */}
        {event.actionUrl && event.actionLabel && (
          <Link
            href={event.actionUrl}
            className="inline-flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 mt-1.5 font-medium transition-colors"
          >
            {event.actionLabel} <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  )
}

export function TimelineItemSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-[#1F2D42] flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/4 bg-[#1F2D42] rounded" />
        <div className="h-2.5 w-1/2 bg-[#1F2D42] rounded" />
      </div>
      <div className="h-2.5 w-10 bg-[#1F2D42] rounded flex-shrink-0" />
    </div>
  )
}
