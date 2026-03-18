'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock, Loader2, CheckCircle, ClipboardList, MessageSquare, Siren, ShieldAlert, Bell } from 'lucide-react'
import { getActivityTimeline } from '@/app/citizen/profile/activity/actions'
import { TimelineItem, TimelineItemSkeleton } from './TimelineItem'
import { TimelineFilter } from './TimelineFilter'
import type { ActivityEvent, ActivityFilter } from '@/lib/validations/activity'
import Link from 'next/link'

const EMPTY_STATES: Record<ActivityFilter, { message: string; cta?: { label: string; href: string } }> = {
  all:      { message: 'No activity yet' },
  reports:  { message: "You haven't filed any reports yet.", cta: { label: 'File a Report →', href: '/citizen/report' } },
  sos:      { message: 'No SOS events recorded' },
  forum:    { message: "You haven't posted in the community forum yet.", cta: { label: 'Go to Forum →', href: '/citizen/forum' } },
  account:  { message: 'No account changes recorded' },
  alerts:   { message: 'No area alerts received' },
}

export function ActivityTimeline() {
  const [filter, setFilter] = useState<ActivityFilter>('all')
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [grouped, setGrouped] = useState<Record<string, ActivityEvent[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Initial load + filter change
  const fetchInitial = useCallback(async (f: ActivityFilter) => {
    setLoading(true)
    setEvents([])
    setGrouped({})
    setCursor(null)
    setHasMore(false)

    const res = await getActivityTimeline(f, null, 20)
    setEvents(res.events)
    setGrouped(res.groupedByDate)
    setHasMore(res.hasMore)
    setCursor(res.nextCursor)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchInitial(filter)
  }, [filter, fetchInitial])

  // Load more
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return
    setLoadingMore(true)

    const res = await getActivityTimeline(filter, cursor, 20)

    setEvents(prev => [...prev, ...res.events])
    setGrouped(prev => {
      const merged = { ...prev }
      for (const [key, items] of Object.entries(res.groupedByDate)) {
        merged[key] = [...(merged[key] || []), ...items]
      }
      return merged
    })
    setHasMore(res.hasMore)
    setCursor(res.nextCursor)
    setLoadingMore(false)
  }, [loadingMore, hasMore, cursor, filter])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [loadMore])

  const handleFilterChange = (f: ActivityFilter) => {
    setFilter(f)
  }

  const emptyState = EMPTY_STATES[filter]

  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F2D42]">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-400" />
          Recent Activity
        </h2>
        <TimelineFilter current={filter} onChange={handleFilterChange} />
      </div>

      {/* Content */}
      <div className="px-2 py-2">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => <TimelineItemSkeleton key={i} />)}
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#1A2235] flex items-center justify-center mx-auto mb-3">
              {filter === 'reports' && <ClipboardList className="w-5 h-5 text-gray-500" />}
              {filter === 'sos' && <Siren className="w-5 h-5 text-gray-500" />}
              {filter === 'forum' && <MessageSquare className="w-5 h-5 text-gray-500" />}
              {filter === 'account' && <ShieldAlert className="w-5 h-5 text-gray-500" />}
              {filter === 'alerts' && <Bell className="w-5 h-5 text-gray-500" />}
              {filter === 'all' && <Clock className="w-5 h-5 text-gray-500" />}
            </div>
            <p className="text-sm text-gray-500">{emptyState.message}</p>
            {emptyState.cta && (
              <Link
                href={emptyState.cta.href}
                className="inline-block mt-3 text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors"
              >
                {emptyState.cta.label}
              </Link>
            )}
          </div>
        ) : (
          <div>
            {Object.entries(grouped).map(([dateLabel, items]) => (
              <div key={dateLabel}>
                {/* Date section header */}
                <div className="flex items-center gap-3 px-3 pt-3 pb-1">
                  <div className="h-px flex-1 bg-[#1F2D42]" />
                  <span className="text-[10px] text-gray-600 font-medium uppercase tracking-wider flex-shrink-0">
                    {dateLabel}
                  </span>
                  <div className="h-px flex-1 bg-[#1F2D42]" />
                </div>
                {/* Items */}
                {items.map(ev => (
                  <TimelineItem key={ev.id} event={ev} />
                ))}
              </div>
            ))}

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="py-3 text-center">
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Loading older activity...</span>
                </div>
              )}
              {!hasMore && events.length > 0 && (
                <div className="flex items-center justify-center gap-1.5 text-gray-600">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="text-[11px]">You&apos;re all caught up</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
