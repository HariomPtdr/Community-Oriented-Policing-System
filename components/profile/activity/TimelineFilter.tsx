'use client'

import { Filter } from 'lucide-react'
import type { ActivityFilter } from '@/lib/validations/activity'

const FILTER_OPTIONS: { value: ActivityFilter; label: string }[] = [
  { value: 'all',      label: 'All Activity' },
  { value: 'reports',  label: 'Reports' },
  { value: 'sos',      label: 'SOS Events' },
  { value: 'forum',    label: 'Forum' },
  { value: 'account',  label: 'Account' },
  { value: 'alerts',   label: 'Alerts' },
]

export function TimelineFilter({
  current,
  onChange
}: {
  current: ActivityFilter
  onChange: (f: ActivityFilter) => void
}) {
  return (
    <div className="relative inline-flex items-center gap-2">
      <Filter className="w-3.5 h-3.5 text-gray-500" />
      <select
        value={current}
        onChange={(e) => onChange(e.target.value as ActivityFilter)}
        className="bg-[#0B0F1A] border border-[#1F2D42] rounded-lg text-xs text-gray-300 pl-2 pr-7 py-1.5 outline-none focus:border-orange-500/50 appearance-none cursor-pointer transition-colors"
      >
        {FILTER_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}
