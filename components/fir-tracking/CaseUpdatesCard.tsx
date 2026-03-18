'use client'

import { ClipboardList, Shield } from 'lucide-react'
import type { CaseUpdate } from '@/lib/validations/fir-tracking'

export function CaseUpdatesCard({ updates }: { updates: CaseUpdate[] }) {
  if (!updates || updates.length === 0) {
    return (
      <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-5">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <ClipboardList className="w-3.5 h-3.5 text-blue-400" /> Case Updates
        </h4>
        <div className="bg-[#0D1420] rounded-xl p-5 text-center border border-[#1F2D42]/50 border-dashed">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">No Updates Yet</p>
          <p className="text-[9px] text-gray-700 mt-0.5">Updates will appear here as your case progresses</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-5">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
        <ClipboardList className="w-3.5 h-3.5 text-blue-400" /> Case Updates
        <span className="ml-auto text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md font-bold border border-blue-500/20">
          {updates.length}
        </span>
      </h4>
      <div className="space-y-4">
        {updates.map((update, i) => (
          <div key={update.id} className={`relative pl-4 border-l-2 ${
            i === 0 ? 'border-blue-500/40' : 'border-[#1F2D42]'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-gray-500">
                {new Date(update.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                {' · '}
                {new Date(update.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {update.poster_name ? (
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-5 h-5 rounded-md bg-blue-500/20 border border-blue-500/20 flex items-center justify-center">
                  <Shield className="w-2.5 h-2.5 text-blue-400" />
                </div>
                <span className="text-[11px] text-white font-medium">{update.poster_name}</span>
                {update.poster_rank && (
                  <span className="text-[9px] text-gray-500 capitalize">{update.poster_rank.replace(/_/g, ' ')}</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[9px] text-gray-500 bg-gray-500/10 px-1.5 py-0.5 rounded font-bold uppercase">System</span>
              </div>
            )}
            <p className="text-[12px] text-gray-300 leading-relaxed">{update.content}</p>
            {update.update_type && (
              <span className={`inline-block mt-1.5 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                update.update_type === 'resolution' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                update.update_type === 'request' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                update.update_type === 'info' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                'bg-gray-500/10 text-gray-400 border border-gray-500/20'
              }`}>{update.update_type}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
