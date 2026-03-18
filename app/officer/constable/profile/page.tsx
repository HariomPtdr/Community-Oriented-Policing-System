'use client'
export default function OfficerProfilePage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-heading font-bold text-white mb-6">My Profile</h1>
      <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-blue-800 flex items-center justify-center text-2xl font-bold text-blue-300">AS</div>
          <div>
            <h2 className="text-white font-semibold text-lg">Constable Anil Sharma</h2>
            <p className="text-gray-500 text-sm">Badge: IND-PC-4421 · Beat 4</p>
            <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-lg font-semibold">Verified ✓</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Rank', value: 'Constable' },
            { label: 'Station', value: 'Palasia PS' },
            { label: 'Beat', value: 'Beat 4 — MG Road' },
            { label: 'Years of Service', value: '8' },
            { label: 'Languages', value: 'Hindi, English' },
            { label: 'Community Rating', value: '⭐ 4.5 (23 ratings)' },
          ].map((item, i) => (
            <div key={i} className="bg-[#0D1420] rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className="text-white text-sm font-medium">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <p className="text-xs text-gray-500 mb-2">Bio</p>
          <p className="text-sm text-gray-400">8 years of service. Specializes in community outreach and youth engagement programs. Passionate about building trust between police and citizens.</p>
        </div>
      </div>
    </div>
  )
}
