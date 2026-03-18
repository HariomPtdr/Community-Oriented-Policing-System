'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import {
  Bell, FileText, Clock, Loader2, RefreshCw, AlertTriangle,
  Info, CheckCircle, ChevronDown, Download, Eye
} from 'lucide-react'

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  urgent: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Urgent' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', label: 'High' },
  normal: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', label: 'Normal' },
  low: { color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20', label: 'Low' },
  info: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', label: 'Info' },
}

const CATEGORY_ICONS: Record<string, string> = {
  operations: '⚡', administrative: '📋', training: '📚', circular: '📌',
  memo: '📝', directive: '🔷', announcement: '📢', other: '📄',
}

export default function DepartmentNoticesPage() {
  const { user } = useCurrentUser()
  const supabase = createClient()

  const [notices, setNotices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all')

  const loadData = useCallback(async () => {
    if (!user) return

    // Try dept_notices table
    const { data: deptNotices, error } = await supabase
      .from('dept_notices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && deptNotices && deptNotices.length > 0) {
      setNotices(deptNotices)
    } else {
      // Fallback: use notifications as notices
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'dept_notice')
        .order('created_at', { ascending: false })
        .limit(50)

      setNotices((notifs || []).map(n => ({
        id: n.id,
        title: n.title,
        content: n.body,
        priority: 'normal',
        category: 'announcement',
        created_at: n.created_at,
        read: n.read,
        issued_by: 'Department',
      })))
    }

    setLoading(false)
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  const filtered = notices.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter === 'urgent') return n.priority === 'urgent' || n.priority === 'high'
    return true
  })

  const unreadCount = notices.filter(n => !n.read).length

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-white">Department Notices</h1>
            <p className="text-xs text-gray-500">Official directives · Circulars · Memos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="text-xs text-teal-400 bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 rounded-xl font-semibold">
              {unreadCount} unread
            </span>
          )}
          <button onClick={loadData}
            className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white bg-[#111827] border border-[#1F2D42] px-3 py-2 rounded-xl transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-[#111827] border border-[#1F2D42] rounded-xl p-1">
        {(['all', 'unread', 'urgent'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all capitalize ${
              filter === f ? 'bg-[#0B0F1A] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {f === 'all' ? `All (${notices.length})` : f === 'unread' ? `Unread (${unreadCount})` : `Urgent (${notices.filter(n => n.priority === 'urgent' || n.priority === 'high').length})`}
          </button>
        ))}
      </div>

      {/* Notices List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl py-16 text-center">
          <Bell className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No notices found</p>
          <p className="text-xs text-gray-600 mt-1">
            {filter !== 'all' ? 'Try changing your filter' : 'Department notices will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(notice => {
            const priority = PRIORITY_CONFIG[notice.priority] || PRIORITY_CONFIG.normal
            const catIcon = CATEGORY_ICONS[notice.category] || '📄'
            const isExpanded = expandedId === notice.id

            return (
              <div key={notice.id}
                className={`bg-[#111827] border rounded-2xl transition-all ${
                  isExpanded ? 'border-teal-500/30' : 'border-[#1F2D42] hover:border-[#2A3A52]'
                } ${!notice.read ? 'border-l-4 border-l-teal-500' : ''}`}
              >
                <button onClick={() => setExpandedId(isExpanded ? null : notice.id)}
                  className="w-full text-left p-4 flex items-center gap-4"
                >
                  <span className="text-lg flex-shrink-0">{catIcon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${priority.bg} ${priority.color}`}>
                        {priority.label}
                      </span>
                      {!notice.read && (
                        <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className={`text-sm font-medium truncate ${notice.read ? 'text-gray-300' : 'text-white'}`}>
                      {notice.title}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {notice.issued_by || 'Department'} · {new Date(notice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="border-t border-[#1F2D42] p-5">
                    <div className="bg-[#0D1420] rounded-xl p-4">
                      <p className="text-[13px] text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {notice.content || notice.body || 'No content available'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-600">
                      <span className="capitalize">{notice.category || 'General'}</span>
                      {notice.reference_number && <span className="font-mono">Ref: {notice.reference_number}</span>}
                      {notice.attachment_url && (
                        <a href={notice.attachment_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-teal-400 hover:text-teal-300"
                        >
                          <Download className="w-3 h-3" /> Attachment
                        </a>
                      )}
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
