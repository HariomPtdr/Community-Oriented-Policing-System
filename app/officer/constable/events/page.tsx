'use client'
export default function EventsPage() {
  const events = [
    { title: 'Community Safety Walk', date: 'Mar 15, 2026', time: '7:00 AM', location: 'MG Road Park', attendees: 42, type: '🏃' },
    { title: 'Beat Meeting — Sector 5', date: 'Mar 18, 2026', time: '4:00 PM', location: 'Community Hall', attendees: 25, type: '🤝' },
    { title: 'Self Defence Workshop (Women)', date: 'Mar 22, 2026', time: '10:00 AM', location: 'Palasia Ground', attendees: 60, type: '🥋' },
  ]
  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-2">Community Events</h1>
      <p className="text-gray-400 text-sm mb-6">Upcoming events in your beat area.</p>
      <div className="space-y-3">
        {events.map((e, i) => (
          <div key={i} className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5 hover:border-orange-500/20 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1A2235] flex items-center justify-center text-xl">{e.type}</div>
              <div className="flex-1">
                <h3 className="text-white font-semibold text-sm">{e.title}</h3>
                <p className="text-xs text-gray-500 mt-1">📅 {e.date} · ⏰ {e.time}</p>
                <p className="text-xs text-gray-500">📍 {e.location} · 👥 {e.attendees} expected</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
