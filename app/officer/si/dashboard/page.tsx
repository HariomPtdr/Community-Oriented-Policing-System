'use client'
import { StatCard } from '@/components/shared/StatCard'
import { RankBadge } from '@/components/shared/RankBadge'
import Link from 'next/link'

export default function SIDashboard() {
  const constables = [
    { name: 'Const. Ramesh Kumar', beat: 'Beat 4', cases: 5, resolved: 2, status: 'active' },
    { name: 'Const. Priya Gupta', beat: 'Beat 7', cases: 3, resolved: 4, status: 'active' },
    { name: 'Const. Anil Sharma', beat: 'Beat 5', cases: 4, resolved: 1, status: 'patrol' },
    { name: 'Const. Meena D.', beat: 'Beat 6', cases: 2, resolved: 3, status: 'off-duty' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">SI Dashboard — Beats 4-7</h1>
        <p className="text-gray-400 text-sm mt-1">Supervisory overview for Sub-Inspector Vijay Singh</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Cases" value="14" change="6 this week" changeType="neutral" borderColor="border-l-orange-500" />
        <StatCard label="Resolved" value="10" change="71% rate" changeType="positive" borderColor="border-l-green-500" />
        <StatCard label="Pending Escalation" value="2" change="Needs attention" changeType="negative" borderColor="border-l-amber-500" />
        <StatCard label="Constables" value="4" change="3 active" changeType="positive" borderColor="border-l-blue-500" />
      </div>

      {/* Constable Grid */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-4">Supervised Constables</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {constables.map((c, i) => (
            <div key={i} className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5 hover:border-[#2563EB20] transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-800 flex items-center justify-center text-xs font-bold text-blue-300">
                    {c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.beat}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold flex items-center gap-1 ${
                  c.status === 'active' ? 'text-green-400' : c.status === 'patrol' ? 'text-amber-400' : 'text-gray-500'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    c.status === 'active' ? 'bg-green-400' : c.status === 'patrol' ? 'bg-amber-400' : 'bg-gray-600'
                  }`} />
                  {c.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#0D1420] rounded-xl p-3 text-center">
                  <p className="text-gray-500">Active</p>
                  <p className="text-white font-bold text-lg">{c.cases}</p>
                </div>
                <div className="bg-[#0D1420] rounded-xl p-3 text-center">
                  <p className="text-gray-500">Resolved</p>
                  <p className="text-green-400 font-bold text-lg">{c.resolved}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
