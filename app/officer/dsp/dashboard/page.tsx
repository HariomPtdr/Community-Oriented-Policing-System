'use client'
import { StatCard } from '@/components/shared/StatCard'
import Link from 'next/link'

export default function DSPDashboard() {
  const stations = [
    { name: 'Palasia Station', sho: 'SHO R. Singh', cases: 24, resolved: 18, complaints: 3, score: 78 },
    { name: 'Vijay Nagar Station', sho: 'SHO M. Patel', cases: 31, resolved: 28, complaints: 1, score: 90 },
    { name: 'Rajwada Station', sho: 'SHO A. Mishra', cases: 19, resolved: 12, complaints: 5, score: 63 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">DSP Dashboard — Zone West</h1>
        <p className="text-gray-400 text-sm mt-1">Deputy SP K. Dubey · 3 Stations · 28 Officers</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Zone Cases" value="74" change="12 this week" changeType="neutral" borderColor="border-l-orange-500" />
        <StatCard label="Zone Resolution" value="78%" change="+5% improvement" changeType="positive" borderColor="border-l-green-500" />
        <StatCard label="Avg Response" value="25m" changeType="neutral" borderColor="border-l-blue-500" />
        <StatCard label="Complaints" value="9" change="6 open" changeType="negative" borderColor="border-l-red-500" />
      </div>

      {/* Station Scorecards */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-4">Station Health Scorecards</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {stations.map((s, i) => (
            <div key={i} className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5 hover:border-[#2563EB20] transition-all">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold">{s.name}</h3>
                  <p className="text-xs text-gray-500">{s.sho}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${
                  s.score >= 80 ? 'border-green-500 text-green-400' : s.score >= 60 ? 'border-amber-500 text-amber-400' : 'border-red-500 text-red-400'
                }`}>
                  {s.score}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div className="bg-[#0D1420] rounded-xl p-3">
                  <p className="text-gray-500">Cases</p>
                  <p className="text-white font-bold text-lg">{s.cases}</p>
                </div>
                <div className="bg-[#0D1420] rounded-xl p-3">
                  <p className="text-gray-500">Resolved</p>
                  <p className="text-green-400 font-bold text-lg">{s.resolved}</p>
                </div>
                <div className="bg-[#0D1420] rounded-xl p-3">
                  <p className="text-gray-500">Complaints</p>
                  <p className={`font-bold text-lg ${s.complaints > 3 ? 'text-red-400' : 'text-gray-300'}`}>{s.complaints}</p>
                </div>
              </div>
              {/* Health bar */}
              <div className="mt-3">
                <div className="w-full bg-[#1A2235] rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all ${
                    s.score >= 80 ? 'bg-green-500' : s.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                  }`} style={{ width: `${s.score}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/officer/dsp/analytics', label: 'Zone Analytics', icon: '📈' },
          { href: '/officer/dsp/directives', label: 'Issue Directive', icon: '📜' },
          { href: '/officer/dsp/escalations', label: 'Escalations', icon: '⬆️' },
          { href: '/officer/dsp/complaints', label: 'Complaints', icon: '📝' },
        ].map(a => (
          <Link key={a.href} href={a.href} className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-orange-500/30 transition-all text-center">
            <span className="text-xl">{a.icon}</span>
            <span className="text-xs text-gray-400">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
