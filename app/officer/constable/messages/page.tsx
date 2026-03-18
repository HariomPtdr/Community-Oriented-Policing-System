'use client'
export default function MessagesPage() {
  const conversations = [
    { id: 1, name: 'Sunita Devi', incident: 'INC-0843', lastMsg: 'Thank you for responding, officer.', time: '10m ago', unread: 0 },
    { id: 2, name: 'Anonymous (INC-0847)', incident: 'INC-0847', lastMsg: 'The suspicious person was last seen near the park entrance.', time: '2h ago', unread: 2 },
    { id: 3, name: 'SI Vijay Singh', incident: null, lastMsg: 'Please file the patrol report by EOD.', time: '4h ago', unread: 1 },
  ]
  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-6">Messages</h1>
      <div className="space-y-2">
        {conversations.map(c => (
          <div key={c.id} className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-4 hover:border-orange-500/20 transition-all cursor-pointer flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#1A2235] flex items-center justify-center text-sm font-bold text-orange-400 flex-shrink-0">
              {c.name.charAt(0) === 'A' ? '?' : c.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white font-medium">{c.name}</p>
                <span className="text-xs text-gray-600">{c.time}</span>
              </div>
              {c.incident && <p className="text-xs font-mono text-amber-400">{c.incident}</p>}
              <p className="text-xs text-gray-500 truncate">{c.lastMsg}</p>
            </div>
            {c.unread > 0 && (
              <span className="w-5 h-5 rounded-full bg-orange-500 text-black text-xs flex items-center justify-center font-bold">
                {c.unread}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
