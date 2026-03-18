'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ClipboardList, Timer, CheckCircle, MessageSquare, Siren,
  ArrowRight, Loader2
} from 'lucide-react'
import type { ActivityStats } from '@/lib/validations/activity'

function CountUp({ end, duration = 600 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const prefersReduced = useRef(false)

  useEffect(() => {
    prefersReduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced.current || end === 0) {
      setCount(end)
      return
    }
    let start = 0
    const step = Math.max(1, Math.floor(end / (duration / 16)))
    const timer = setInterval(() => {
      start += step
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(start)
      }
    }, 16)
    return () => clearInterval(timer)
  }, [end, duration])

  return <>{count}</>
}

function StatSkeleton() {
  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-4 animate-pulse">
      <div className="flex items-center justify-center mb-3">
        <div className="w-8 h-8 rounded-full bg-[#1F2D42]" />
      </div>
      <div className="h-7 w-12 bg-[#1F2D42] rounded mx-auto mb-2" />
      <div className="h-3 w-16 bg-[#1F2D42] rounded mx-auto mb-1" />
      <div className="h-2.5 w-12 bg-[#1F2D42] rounded mx-auto" />
    </div>
  )
}

export function StatCardsRow({ stats, loading }: { stats: ActivityStats | null; loading: boolean }) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />)}
      </div>
    )
  }

  const resRate = stats.resolutionRatePct
  const isPerfect = resRate === 100 && stats.totalReports > 0

  const cards = [
    {
      label: 'Total Reports',
      val: stats.totalReports,
      sub: 'All time',
      icon: ClipboardList,
      iconColor: 'text-gray-400',
      numColor: 'text-white',
      border: 'border-[#1F2D42]',
      link: null,
    },
    {
      label: 'Active',
      val: stats.activeReports,
      sub: 'In progress',
      icon: Timer,
      iconColor: stats.activeReports > 0 ? 'text-amber-400' : 'text-gray-500',
      numColor: stats.activeReports > 0 ? 'text-amber-400' : 'text-gray-500',
      border: 'border-[#1F2D42]',
      link: stats.activeReports > 0 ? '/citizen/my-reports?status=active' : null,
    },
    {
      label: 'Resolved',
      val: stats.resolvedReports,
      sub: stats.totalReports > 0
        ? isPerfect ? '🎉 100%' : `${resRate}% rate`
        : '',
      icon: CheckCircle,
      iconColor: stats.resolvedReports > 0 ? 'text-green-400' : 'text-gray-500',
      numColor: stats.resolvedReports > 0 ? 'text-green-400' : 'text-gray-500',
      border: isPerfect ? 'border-amber-500/40' : 'border-[#1F2D42]',
      link: null,
    },
    {
      label: 'Forum Posts',
      val: stats.forumPosts,
      sub: 'Community',
      icon: MessageSquare,
      iconColor: stats.forumPosts > 0 ? 'text-blue-400' : 'text-gray-500',
      numColor: stats.forumPosts > 0 ? 'text-blue-400' : 'text-gray-500',
      border: 'border-[#1F2D42]',
      link: stats.forumPosts > 0 ? '/citizen/forum' : null,
    },
    {
      label: 'SOS Events',
      val: stats.sosEvents,
      sub: 'All time (real)',
      icon: Siren,
      iconColor: 'text-red-400',
      numColor: stats.sosEvents > 0 ? 'text-red-400' : 'text-gray-500',
      border: stats.sosEvents > 0 ? 'border-red-900/50' : 'border-[#1F2D42]',
      link: '/citizen/sos',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(c => {
        const Icon = c.icon
        return (
          <div
            key={c.label}
            className={`bg-[#111827] border ${c.border} rounded-xl p-4 text-center relative group hover:bg-[#1A2235] transition-colors`}
          >
            <div className="flex items-center justify-center mb-2">
              <div className={`w-8 h-8 rounded-full ${c.label === 'SOS Events' ? 'bg-red-500/10' : 'bg-[#1A2235]'} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${c.iconColor}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold font-mono ${c.numColor}`}>
              <CountUp end={c.val} />
            </p>
            <p className="text-[10px] text-gray-500 mt-1 font-medium uppercase tracking-wider">{c.label}</p>
            {c.sub && <p className="text-[9px] text-gray-600 mt-0.5">{c.sub}</p>}
            {c.link && (
              <a href={c.link} className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}
