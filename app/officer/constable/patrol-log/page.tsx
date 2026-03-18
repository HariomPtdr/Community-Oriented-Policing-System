'use client'
export default function PatrolLogPage() {
  const logs = [
    { date: '12/03/2026', start: '06:00', end: '12:15', beat: 'Beat 4', notes: 'Routine patrol. Checked 3 hotspots. No incidents.', distance: '8.2 km' },
    { date: '11/03/2026', start: '06:00', end: '12:00', beat: 'Beat 4', notes: 'Responded to suspicious activity call at MG Road.', distance: '7.8 km' },
    { date: '10/03/2026', start: '18:00', end: '00:00', beat: 'Beat 4', notes: 'Evening patrol. Vehicle theft report filed.', distance: '6.5 km' },
  ]
  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-2">Patrol Log</h1>
      <p className="text-gray-400 text-sm mb-6">Your daily patrol records.</p>
      <div className="space-y-3">
        {logs.map((log, i) => (
          <div key={i} className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">🚔</span>
                <div>
                  <p className="text-sm text-white font-medium">{log.date}</p>
                  <p className="text-xs text-gray-500">{log.beat}</p>
                </div>
              </div>
              <span className="text-xs text-gray-400 font-mono">{log.start} — {log.end}</span>
            </div>
            <p className="text-sm text-gray-400 mb-2">{log.notes}</p>
            <div className="flex gap-4 text-xs text-gray-600">
              <span>📏 {log.distance}</span>
              <span>⏱ {(() => { const [sh, sm] = log.start.split(':').map(Number); const [eh, em] = log.end.split(':').map(Number); let hrs = eh - sh; if (hrs < 0) hrs += 24; return `${hrs}h ${Math.abs(em - sm)}m`; })()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
