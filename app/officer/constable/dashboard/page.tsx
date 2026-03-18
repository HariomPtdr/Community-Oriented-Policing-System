'use client'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { CATEGORY_ICONS } from '@/lib/types'
import Link from 'next/link'

export default function ConstableDashboard() {
  const cases = [
    { id: 'INC-2024-0847', title: 'Suspicious Activity — MG Road', category: 'suspicious_activity', status: 'in_progress', priority: 'high', reporter: 'Anonymous', time: '2h ago' },
    { id: 'INC-2024-0843', title: 'Noise Complaint — Sector 5', category: 'noise_complaint', status: 'assigned', priority: 'medium', reporter: 'Sunita Devi', time: '4h ago' },
    { id: 'INC-2024-0839', title: 'Vehicle Parking Dispute', category: 'traffic', status: 'assigned', priority: 'low', reporter: 'Rahul Patel', time: '6h ago' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">Good morning, Constable Sharma</h1>
        <p className="text-gray-400 text-sm mt-1">Beat 4 — MG Road Area · 12 March 2026</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Cases" value="5" change="2 new today" changeType="neutral" borderColor="border-l-orange-500" />
        <StatCard label="Resolved Today" value="2" change="+1 from yesterday" changeType="positive" borderColor="border-l-green-500" />
        <StatCard label="Unread Messages" value="3" changeType="neutral" borderColor="border-l-blue-500" />
        <StatCard label="SOS Alerts" value="0" change="No active alerts" changeType="positive" borderColor="border-l-red-500" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cases */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Active Cases in Your Beat</h2>
            <Link href="/officer/constable/cases" className="text-xs text-orange-400 hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {cases.map(c => (
              <div key={c.id} className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5 hover:border-[#2563EB20] transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-lg flex-shrink-0">
                      {CATEGORY_ICONS[c.category]}
                    </div>
                    <div>
                      <p className="text-xs font-mono text-amber-400 mb-0.5">{c.id}</p>
                      <p className="text-sm text-white font-medium">{c.title}</p>
                      <p className="text-xs text-gray-500 mt-1">Reporter: {c.reporter} · {c.time}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge status={c.status} />
                    <PriorityBadge priority={c.priority} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Beat Map placeholder */}
          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">🗺️ Beat Map</h3>
            <div className="h-48 bg-[#0D1420] rounded-xl border border-blue-900/30 flex items-center justify-center">
              <p className="text-xs text-gray-600">Map loads with Mapbox integration</p>
            </div>
            <Link href="/officer/constable/beat-map" className="block w-full cops-btn-secondary text-xs text-center mt-3 py-2">
              Open Full Map
            </Link>
          </div>

          {/* Patrol status */}
          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">🚔 Patrol Status</h3>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400">Today&apos;s Patrol</span>
              <span className="text-xs text-green-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Active
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-center">
              <div className="bg-[#0D1420] rounded-xl p-3">
                <p className="text-gray-500">Started</p>
                <p className="text-white font-mono mt-0.5">06:00</p>
              </div>
              <div className="bg-[#0D1420] rounded-xl p-3">
                <p className="text-gray-500">Duration</p>
                <p className="text-white font-mono mt-0.5">6h 15m</p>
              </div>
            </div>
            <Link href="/officer/constable/patrol-log" className="block w-full cops-btn-primary text-xs text-center mt-3 py-2">
              View Patrol Log
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
