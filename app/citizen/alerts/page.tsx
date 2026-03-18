'use client'
import { ALERT_TYPE_VISUAL } from '@/lib/types'

export default function AlertsPage() {
  const alerts = [
    { type: 'crime_alert', title: 'Chain snatching reported near MG Road', location: 'MG Road, Indore', time: '2 hours ago', description: 'Two suspects on a motorcycle snatched a gold chain near the MG Road crossing.' },
    { type: 'missing_person', title: 'Missing Person — 12 year old boy', location: 'Vijay Nagar, Indore', time: '5 hours ago', description: 'Ravi, 12 years old, last seen wearing blue shirt and black pants near Vijay Nagar park.' },
    { type: 'safety_advisory', title: 'Road closure for maintenance', location: 'Main Market, Indore', time: '1 day ago', description: 'AB Road between Palasia and Rajwada will be closed for repairs from 10 PM to 5 AM this week.' },
    { type: 'wanted_notice', title: 'Wanted — Suspected Vehicle Thief', location: 'All areas', time: '2 days ago', description: 'Male, approximately 30 years old, thin build. Suspected in multiple two-wheeler thefts.' },
    { type: 'sos', title: 'SOS Alert — Emergency assistance requested', location: 'Near Railway Station', time: '3 hours ago', description: 'A citizen has triggered an SOS alert. Officers dispatched.' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-2">Crime Alerts</h1>
      <p className="text-gray-400 text-sm mb-6">Stay informed about incidents in your neighborhood.</p>

      <div className="space-y-3">
        {alerts.map((alert, i) => {
          const visual = ALERT_TYPE_VISUAL[alert.type] || ALERT_TYPE_VISUAL.crime_alert
          return (
            <div key={i} className={`bg-[#111827] border border-[#1F2D42] rounded-2xl p-5 hover:border-[#2563EB20] transition-all`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${visual.bg} flex items-center justify-center text-lg flex-shrink-0`}>
                  {visual.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${visual.color}`}>{visual.label}</span>
                    <span className="text-xs text-gray-600">·</span>
                    <span className="text-xs text-gray-500">{alert.time}</span>
                  </div>
                  <p className="text-sm text-white font-medium mb-1">{alert.title}</p>
                  <p className="text-xs text-gray-500 mb-2">📍 {alert.location}</p>
                  <p className="text-sm text-gray-400 leading-relaxed">{alert.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
