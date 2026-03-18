'use client'

import { Shield, UserCircle } from 'lucide-react'
import type { OfficerInfo } from '@/lib/validations/fir-tracking'

export function AssignedOfficerCard({ officer }: { officer: OfficerInfo | null }) {
  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-5">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-blue-400" /> Assigned Officer
      </h4>

      {officer ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-blue-500/25 flex items-center justify-center text-base font-bold text-blue-400">
              {officer.full_name.charAt(0)}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">{officer.full_name}</p>
              <p className="text-[11px] text-gray-400 capitalize">{officer.rank?.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t border-[#1F2D42]">
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Shield className="w-3.5 h-3.5 text-gray-500" />
              <span>Badge:</span>
              <span className="font-mono text-white">{officer.badge_number}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1F2D42]">
            <div className="bg-[#0D1420] rounded-lg p-2.5 text-center">
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">Investigating</p>
              <p className="text-[10px] text-white font-semibold mt-0.5">I/O</p>
            </div>
            <div className="bg-[#0D1420] rounded-lg p-2.5 text-center">
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">Field</p>
              <p className="text-[10px] text-white font-semibold mt-0.5">F/O</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0D1420] rounded-xl p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-3">
            <UserCircle className="w-6 h-6 text-blue-400/50" />
          </div>
          <p className="text-xs text-gray-400 font-medium">Not Yet Assigned</p>
          <p className="text-[10px] text-gray-600 mt-1">An officer will be assigned after FIR review.</p>
          <p className="text-[10px] text-blue-400/50 mt-2 italic">Expected: 1-3 business days</p>
        </div>
      )}
    </div>
  )
}
