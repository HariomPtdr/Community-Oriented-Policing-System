'use client'

import { useEffect, useState } from 'react'
import { getActivityStats, getMonthlySummary } from '@/app/citizen/profile/activity/actions'
import { StatCardsRow } from './StatCardsRow'
import { MonthlySummaryCard } from './MonthlySummaryCard'
import { ActivityTimeline } from './ActivityTimeline'
import type { ActivityStats, MonthlySummary } from '@/lib/validations/activity'

export function ActivityShell() {
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [s, m] = await Promise.all([
          getActivityStats(),
          getMonthlySummary()
        ])
        setStats(s)
        setSummary(m)
      } catch (err) {
        console.error('Failed to load activity data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-4">
      {/* 1. Stat Cards */}
      <StatCardsRow stats={stats} loading={loading} />

      {/* 2. Monthly Summary */}
      <MonthlySummaryCard summary={summary} />

      {/* 3. Activity Timeline */}
      <ActivityTimeline />
    </div>
  )
}
