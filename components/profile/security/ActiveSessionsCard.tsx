'use client'

import { useTransition } from 'react'
import { Smartphone, Monitor, Tablet, MapPin, Clock, AlertTriangle, LogOut, Loader2 } from 'lucide-react'
import { revokeSession, revokeAllOtherSessions } from '@/app/citizen/profile/security/actions'

export function ActiveSessionsCard({ sessions }: { sessions: any[] }) {
  const [isPending, startTransition] = useTransition()

  const handleRevoke = (id: string) => {
    startTransition(async () => {
      await revokeSession(id)
    })
  }

  const handleRevokeAll = () => {
    startTransition(async () => {
      await revokeAllOtherSessions()
    })
  }

  const getIcon = (type: string) => {
    if (type === 'mobile') return <Smartphone className="w-5 h-5 text-gray-400" />
    if (type === 'tablet') return <Tablet className="w-5 h-5 text-gray-400" />
    return <Monitor className="w-5 h-5 text-gray-400" />
  }

  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-blue-400" /> Active Sessions
          <span className="bg-[#1F2D42] text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded-full">{sessions.length}</span>
        </h2>
      </div>

      <div className="space-y-4">
        {sessions.map((s, idx) => (
          <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#1A2235] border border-[#1F2D42] rounded-xl hover:border-[#2a3a52] transition-colors relative">
            
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#0B0F1A] rounded-lg shrink-0">
                {getIcon(s.deviceType)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-white">{s.deviceName} ({s.browser})</h3>
                  {s.isCurrent && (
                    <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ● This device
                    </span>
                  )}
                  {s.isSuspicious && (
                    <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Unusual location
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {s.city}, {s.region}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Active: {new Date(s.lastActiveAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {!s.isCurrent && (
              <button
                onClick={() => handleRevoke(s.id)}
                disabled={isPending}
                className="self-end sm:self-center text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-semibold"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                Revoke
              </button>
            )}
          </div>
        ))}

        {sessions.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">Only this device is active.</p>
        )}
      </div>

      {sessions.length > 1 && (
        <div className="mt-6 pt-6 border-t border-[#1F2D42] flex justify-end">
          <button
            onClick={handleRevokeAll}
            disabled={isPending}
            className="text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Revoke All Other Sessions
          </button>
        </div>
      )}
    </div>
  )
}
