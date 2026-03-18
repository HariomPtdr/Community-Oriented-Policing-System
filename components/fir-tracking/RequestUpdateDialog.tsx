'use client'

import { Info, Loader2, Clock, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { requestStatusUpdate } from '@/app/citizen/my-reports/[incidentId]/actions'

export function RequestUpdateDialog({ incidentId, canRequest, lastRequest, onSuccess }: {
  incidentId: string; canRequest: boolean; lastRequest: any; onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const cooldownHours = lastRequest
    ? Math.max(0, Math.ceil((48 * 3600000 - (Date.now() - new Date(lastRequest.requested_at).getTime())) / 3600000))
    : 0

  const handleSubmit = async () => {
    setSubmitting(true)
    const formData = new FormData()
    formData.set('incidentId', incidentId)
    if (message) formData.set('message', message)
    const res = await requestStatusUpdate(null, formData)
    setResult(res)
    setSubmitting(false)
    if (res?.success) {
      setTimeout(() => { setOpen(false); setResult(null); setMessage(''); onSuccess() }, 2000)
    }
  }

  return (
    <>
      <button
        onClick={() => canRequest ? setOpen(true) : null}
        disabled={!canRequest}
        className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl p-3 flex items-center gap-3 hover:border-orange-500/20 hover:bg-orange-500/[0.02] transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
        title={!canRequest ? `Next request available in ${cooldownHours}h` : ''}
      >
        <Info className="w-4 h-4 text-gray-500 group-hover:text-orange-400 transition-colors" />
        <div className="flex-1">
          <span className="text-xs text-gray-400 group-hover:text-white transition-colors">Request Status Update</span>
          {!canRequest && <p className="text-[9px] text-gray-600 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> Available in {cooldownHours}h</p>}
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            {result?.success ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-sm text-white font-medium">{result.message}</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white mb-2">Request Case Update</h3>
                <p className="text-xs text-gray-400 mb-4">Your case will be flagged for officer attention. You can request an update once every 48 hours.</p>
                {result?.error && <p className="text-xs text-red-400 mb-3 bg-red-500/10 p-2 rounded-lg border border-red-500/20">{result.error}</p>}
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Optional message to officer (max 500 chars)..."
                  maxLength={500}
                  rows={3}
                  className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-orange-500/40 transition-colors resize-none mb-4"
                />
                <div className="flex gap-3">
                  <button onClick={() => setOpen(false)} className="flex-1 text-sm text-gray-400 border border-[#1F2D42] rounded-xl py-2.5 hover:text-white hover:border-[#2A3A52] transition-colors">Cancel</button>
                  <button onClick={handleSubmit} disabled={submitting} className="flex-1 text-sm font-semibold bg-orange-500 text-black rounded-xl py-2.5 hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Send Request
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
