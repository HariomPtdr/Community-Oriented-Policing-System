'use client'
export default function SIConstablesPage() {
  const constables = [
    { name: 'Const. Ramesh Kumar', beat: 'Beat 4', cases: 5, resolved: 2, rating: 4.5 },
    { name: 'Const. Priya Gupta', beat: 'Beat 7', cases: 3, resolved: 4, rating: 4.8 },
    { name: 'Const. Anil Sharma', beat: 'Beat 5', cases: 4, resolved: 1, rating: 3.9 },
    { name: 'Const. Meena D.', beat: 'Beat 6', cases: 2, resolved: 3, rating: 4.1 },
  ]
  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-white mb-6">My Constables</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {constables.map((c, i) => (
          <div key={i} className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-800 flex items-center justify-center text-xs font-bold text-blue-300">{c.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
              <div><p className="text-sm text-white font-medium">{c.name}</p><p className="text-xs text-gray-500">{c.beat} · ⭐ {c.rating}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-center">
              <div className="bg-[#0D1420] rounded-xl p-3"><p className="text-gray-500">Active</p><p className="text-white font-bold text-lg">{c.cases}</p></div>
              <div className="bg-[#0D1420] rounded-xl p-3"><p className="text-gray-500">Resolved</p><p className="text-green-400 font-bold text-lg">{c.resolved}</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
