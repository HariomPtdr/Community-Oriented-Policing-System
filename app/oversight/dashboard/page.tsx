'use client'
import { StatCard } from '@/components/shared/StatCard'

export default function OversightDashboard() {
  const complaints = [
    { id: 'COMP-001', against: 'Const. D. Mishra', category: 'Excessive Force', status: 'Under Investigation', filed: '10/03/2026', severity: 'High' },
    { id: 'COMP-002', against: 'SI K. Patel', category: 'Negligence', status: 'Filed', filed: '11/03/2026', severity: 'Medium' },
    { id: 'COMP-003', against: 'Const. A. Kumar', category: 'Harassment', status: 'Resolved', filed: '08/03/2026', severity: 'High' },
    { id: 'COMP-004', against: 'Const. P. Sharma', category: 'Delay in Response', status: 'Dismissed', filed: '05/03/2026', severity: 'Low' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">Oversight Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Independent review of police conduct and accountability</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Complaints" value="8" change="3 this week" changeType="neutral" borderColor="border-l-teal-500" />
        <StatCard label="Avg Resolution" value="14d" change="-2d improvement" changeType="positive" borderColor="border-l-green-500" />
        <StatCard label="Use of Force" value="3" change="Reports this month" changeType="negative" borderColor="border-l-red-500" />
        <StatCard label="Citizen Satisfaction" value="3.8" change="Out of 5" changeType="neutral" borderColor="border-l-amber-500" />
      </div>

      {/* Complaints table */}
      <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1F2D42]">
          <h2 className="text-sm font-semibold text-white">Officer Complaints — Read Only</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1F2D42]">
                {['ID', 'Against', 'Category', 'Status', 'Severity', 'Filed'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2D42]/50">
              {complaints.map(c => (
                <tr key={c.id} className="hover:bg-[#1A2235] transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-teal-400">{c.id}</td>
                  <td className="px-4 py-3 text-sm text-white">{c.against}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{c.category}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                      c.status === 'Under Investigation' ? 'bg-amber-500/15 text-amber-400' :
                      c.status === 'Filed' ? 'bg-blue-500/15 text-blue-400' :
                      c.status === 'Resolved' ? 'bg-green-500/15 text-green-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${
                      c.severity === 'High' ? 'text-red-400' : c.severity === 'Medium' ? 'text-amber-400' : 'text-gray-400'
                    }`}>● {c.severity}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.filed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
