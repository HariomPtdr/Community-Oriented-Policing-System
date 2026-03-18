'use client'
import { StatCard } from '@/components/shared/StatCard'
import Link from 'next/link'

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">System Administration</h1>
        <p className="text-gray-400 text-sm mt-1">Platform-wide management and monitoring</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value="1,247" change="+42 this month" changeType="positive" borderColor="border-l-purple-500" />
        <StatCard label="Active Officers" value="47" change="3 pending verification" changeType="neutral" borderColor="border-l-blue-500" />
        <StatCard label="Total Incidents" value="12,480" change="+312 this month" changeType="neutral" borderColor="border-l-orange-500" />
        <StatCard label="System Health" value="99.2%" change="Uptime last 30d" changeType="positive" borderColor="border-l-green-500" />
      </div>

      {/* Management grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { href: '/admin/users', icon: '👥', label: 'User Management', desc: 'Manage accounts, verify officers' },
          { href: '/admin/zones', icon: '🗺️', label: 'Zone Management', desc: 'Create/edit zones, assign DSPs' },
          { href: '/admin/stations', icon: '🏢', label: 'Station Management', desc: 'Manage stations, assign SHOs' },
          { href: '/admin/analytics', icon: '📈', label: 'Analytics', desc: 'Platform-wide statistics' },
          { href: '/admin/complaints', icon: '📝', label: 'Complaints', desc: 'Review officer complaints' },
          { href: '/admin/audit-log', icon: '📜', label: 'Audit Log', desc: 'System-wide activity log' },
          { href: '/admin/system', icon: '⚙️', label: 'System Config', desc: 'App settings and configuration' },
          { href: '#', icon: '🔔', label: 'Notifications', desc: 'Broadcast system alerts' },
        ].map(item => (
          <Link key={item.href} href={item.href} className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5 hover:border-purple-500/30 transition-all">
            <span className="text-3xl">{item.icon}</span>
            <h3 className="text-white font-semibold text-sm mt-3 mb-1">{item.label}</h3>
            <p className="text-gray-500 text-xs">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1F2D42]">
          <h2 className="text-sm font-semibold text-white">Recent System Activity</h2>
        </div>
        <div className="divide-y divide-[#1F2D42]/50">
          {[
            { action: 'Officer Verified', detail: 'SHO R. Singh verified Const. Ramesh Kumar', time: '10m ago', icon: '✅' },
            { action: 'New Zone Created', detail: 'Zone East created with 4 stations', time: '2h ago', icon: '🗺️' },
            { action: 'Account Suspended', detail: 'Const. D. Mishra suspended for inquiry', time: '5h ago', icon: '🔴' },
            { action: 'Bulk Import', detail: '12 constable accounts imported from CSV', time: '1d ago', icon: '📥' },
            { action: 'Config Updated', detail: 'SOS radius changed to 2km', time: '2d ago', icon: '⚙️' },
          ].map((a, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-[#1A2235] transition-colors">
              <span className="text-lg">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium">{a.action}</p>
                <p className="text-xs text-gray-500 truncate">{a.detail}</p>
              </div>
              <span className="text-xs text-gray-600 flex-shrink-0">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
