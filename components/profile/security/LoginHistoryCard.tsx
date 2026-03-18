'use client'

import { Clock, CheckCircle, XCircle, AlertTriangle, ShieldOff, Info } from 'lucide-react'

export function LoginHistoryCard({ history, failedCount }: { history: any[], failedCount: number }) {
  const getBadge = (result: string, reason: string | null) => {
    switch (result) {
      case 'success':
        return <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Success</span>
      case 'failed':
        return (
          <span className="group relative flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full cursor-help">
            <XCircle className="w-3 h-3" /> Failed
            {reason && (
              <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {reason}
              </span>
            )}
          </span>
        )
      case 'blocked':
        return <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> Blocked</span>
      case '2fa_failed':
      case '2fa_success':
        return <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full"><ShieldOff className="w-3 h-3" /> 2FA {result.includes('succ') ? 'Success' : 'Failed'}</span>
      default:
        return <span className="text-[10px] font-bold uppercase text-gray-400 border border-gray-600 px-2 py-0.5 rounded-full">{result}</span>
    }
  }

  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-xl overflow-hidden">
      <div className="p-6 border-b border-[#1F2D42]">
        <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" /> Recent Login Activity
        </h2>
      </div>

      {failedCount > 0 && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400 font-semibold">{failedCount} failed login attempt{failedCount > 1 ? 's' : ''} in the last 7 days</p>
        </div>
      )}

      {history.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No login history yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400 whitespace-nowrap">
            <thead className="text-xs uppercase bg-[#1A2235] text-gray-500 border-b border-[#1F2D42]">
              <tr>
                <th className="px-6 py-3 font-semibold tracking-wider">Time</th>
                <th className="px-6 py-3 font-semibold tracking-wider">Result</th>
                <th className="px-6 py-3 font-semibold tracking-wider">Device</th>
                <th className="px-6 py-3 font-semibold tracking-wider">Location</th>
                <th className="px-6 py-3 font-semibold tracking-wider">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2D42]">
              {history.map((h, i) => (
                <tr key={i} className="hover:bg-[#1A2235]/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-[11px] text-gray-300">{new Date(h.attemptedAt).toLocaleString()}</td>
                  <td className="px-6 py-4">{getBadge(h.result, h.failureReason)}</td>
                  <td className="px-6 py-4 text-xs">{h.browser} • {h.os}</td>
                  <td className="px-6 py-4 text-xs">{h.city}, {h.region}</td>
                  <td className="px-6 py-4">
                    {h.isSuspicious ? (
                      <span className="flex items-center gap-1 text-yellow-500/90" title="Suspicious location or time">
                        <AlertTriangle className="w-4 h-4" /> Suspicious
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
