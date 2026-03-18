'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActivityStats, MonthlySummary, ActivityEvent, ActivityFilter } from '@/lib/validations/activity'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatMonthLabel(date: Date): string {
  return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
}

function groupByDate(events: ActivityEvent[]): Record<string, ActivityEvent[]> {
  const groups: Record<string, ActivityEvent[]> = {}
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 6 * 86400000)

  for (const ev of events) {
    const evDate = new Date(ev.createdAt)
    const evDay = new Date(evDate.getFullYear(), evDate.getMonth(), evDate.getDate())

    let label: string
    if (evDay.getTime() === today.getTime()) {
      label = 'Today'
    } else if (evDay.getTime() === yesterday.getTime()) {
      label = 'Yesterday'
    } else if (evDay.getTime() >= weekAgo.getTime()) {
      label = evDate.toLocaleDateString('en-IN', { weekday: 'long' })
    } else {
      label = evDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    }

    if (!groups[label]) groups[label] = []
    groups[label].push(ev)
  }
  return groups
}

// ── Action 1: getActivityStats ───────────────────────────────────────────────

export async function getActivityStats(): Promise<ActivityStats> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { totalReports: 0, activeReports: 0, resolvedReports: 0, resolutionRatePct: 0, forumPosts: 0, sosEvents: 0, memberSinceDays: 0 }

  const [
    { count: total },
    { count: active },
    { count: resolved },
    { count: posts },
    { count: sos },
    { data: profileData }
  ] = await Promise.all([
    supabase.from('incidents').select('*', { count: 'exact', head: true })
      .eq('reporter_id', user.id).not('status', 'eq', 'draft'),
    supabase.from('incidents').select('*', { count: 'exact', head: true })
      .eq('reporter_id', user.id)
      .in('status', ['submitted', 'under_review', 'assigned', 'in_progress']),
    supabase.from('incidents').select('*', { count: 'exact', head: true })
      .eq('reporter_id', user.id)
      .in('status', ['resolved', 'closed']),
    supabase.from('forum_posts').select('*', { count: 'exact', head: true })
      .eq('author_id', user.id),
    supabase.from('sos_events').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase.from('profiles').select('created_at').eq('id', user.id).single()
  ])

  const t = total || 0
  const r = resolved || 0
  const memberSinceDays = profileData?.created_at
    ? Math.max(0, Math.floor((Date.now() - new Date(profileData.created_at).getTime()) / 86400000))
    : 0

  return {
    totalReports: t,
    activeReports: active || 0,
    resolvedReports: r,
    resolutionRatePct: t > 0 ? Math.round((r / t) * 100) : 0,
    forumPosts: posts || 0,
    sosEvents: sos || 0,
    memberSinceDays,
  }
}

// ── Action 2: getMonthlySummary ──────────────────────────────────────────────

export async function getMonthlySummary(): Promise<MonthlySummary> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const empty: MonthlySummary = {
    monthLabel: formatMonthLabel(new Date()),
    reportsFiled: 0, reportsResolved: 0, reportsActive: 0,
    sosActivated: 0, forumPosts: 0, alertsReceived: 0, memberSinceDays: 0
  }
  if (!user) return empty

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: filed },
    { count: resolvedCount },
    { count: activeCount },
    { count: sosCount },
    { count: postsCount },
    { data: profileData }
  ] = await Promise.all([
    supabase.from('incidents').select('*', { count: 'exact', head: true })
      .eq('reporter_id', user.id).gte('created_at', monthStart).not('status', 'eq', 'draft'),
    supabase.from('incidents').select('*', { count: 'exact', head: true })
      .eq('reporter_id', user.id).gte('updated_at', monthStart).in('status', ['resolved', 'closed']),
    supabase.from('incidents').select('*', { count: 'exact', head: true })
      .eq('reporter_id', user.id).in('status', ['submitted', 'under_review', 'assigned', 'in_progress']),
    supabase.from('sos_events').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', monthStart),
    supabase.from('forum_posts').select('*', { count: 'exact', head: true })
      .eq('author_id', user.id).gte('created_at', monthStart),
    supabase.from('profiles').select('created_at').eq('id', user.id).single()
  ])

  const memberSinceDays = profileData?.created_at
    ? Math.max(0, Math.floor((Date.now() - new Date(profileData.created_at).getTime()) / 86400000))
    : 0

  return {
    monthLabel: formatMonthLabel(now),
    reportsFiled: filed || 0,
    reportsResolved: resolvedCount || 0,
    reportsActive: activeCount || 0,
    sosActivated: sosCount || 0,
    forumPosts: postsCount || 0,
    alertsReceived: 0,
    memberSinceDays
  }
}

// ── Action 3: getActivityTimeline (cursor-based) ─────────────────────────────

export async function getActivityTimeline(
  filter: ActivityFilter = 'all',
  cursor: string | null = null,
  pageSize: number = 20
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { events: [], groupedByDate: {}, hasMore: false, nextCursor: null }

  const safePageSize = Math.min(pageSize, 50)

  let query = supabase
    .from('citizen_activity_log')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(safePageSize + 1)

  if (filter !== 'all') {
    query = query.eq('category', filter)
  }
  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error || !data) {
    return { events: [], groupedByDate: {}, hasMore: false, nextCursor: null }
  }

  const hasMore = data.length > safePageSize
  const items = hasMore ? data.slice(0, safePageSize) : data

  const events: ActivityEvent[] = items.map((row: any) => ({
    id: row.id,
    createdAt: row.created_at,
    eventType: row.event_type,
    title: row.title,
    subtitle: row.subtitle,
    actionLabel: row.action_label,
    actionUrl: row.action_url,
    metadata: row.metadata || {},
    category: row.category,
  }))

  return {
    events,
    groupedByDate: groupByDate(events),
    hasMore,
    nextCursor: hasMore && events.length > 0 ? events[events.length - 1].createdAt : null,
  }
}
