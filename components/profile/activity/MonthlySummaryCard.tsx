'use client'

import { Calendar, User } from 'lucide-react'
import type { MonthlySummary } from '@/lib/validations/activity'

function formatDuration(days: number): string {
  if (days === 0) return 'Today'
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`
  if (days < 365) {
    const months = Math.floor(days / 30)
    return `${months} month${months !== 1 ? 's' : ''}`
  }
  const years = Math.floor(days / 365)
  return `${years} year${years !== 1 ? 's' : ''}`
}

export function MonthlySummaryCard({ summary }: { summary: MonthlySummary | null }) {
  if (!summary) return null

  // Build only non-zero items
  const parts: string[] = []
  if (summary.reportsFiled > 0) parts.push(`${summary.reportsFiled} report${summary.reportsFiled > 1 ? 's' : ''} filed`)
  if (summary.reportsResolved > 0) parts.push(`${summary.reportsResolved} resolved`)
  if (summary.sosActivated > 0) parts.push(`${summary.sosActivated} SOS`)
  if (summary.forumPosts > 0) parts.push(`${summary.forumPosts} post${summary.forumPosts > 1 ? 's' : ''}`)

  const hasActivity = parts.length > 0
  const summaryLine = hasActivity ? parts.join(' · ') : 'No activity this month yet'

  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-xl px-5 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        {/* Left: Month + summary */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-orange-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{summary.monthLabel} Summary</h3>
            <p className={`text-xs mt-0.5 truncate ${hasActivity ? 'text-gray-400' : 'text-gray-600'}`}>
              {summaryLine}
            </p>
          </div>
        </div>

        {/* Right: Member duration */}
        <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0 sm:pl-4">
          <User className="w-3.5 h-3.5" />
          <span>Member for {formatDuration(summary.memberSinceDays)}</span>
        </div>
      </div>
    </div>
  )
}
