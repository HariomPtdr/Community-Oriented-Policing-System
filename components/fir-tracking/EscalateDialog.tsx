'use client'

import { Scale, Loader2, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { escalateReport } from '@/app/citizen/my-reports/[incidentId]/actions'

export function EscalateDialog({ incidentId, canEscalate, lastEscalation, onSuccess }: {
  incidentId: string; canEscalate: boolean; lastEscalation: any; onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [escalateTo, setEscalateTo] = useState('sho')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const cooldownDays = lastEscalation
    ? Math.max(0, Math.ceil((7 * 86400000 - (Date.now() - new Date(lastEscalation.escalated_at || lastEscalation.created_at).getTime())) / 86400000))
    : 0

  const handleSubmit = async () => {
    if (reason.length < 30) return
    setSubmitting(true)
    const formData = new FormData()
    formData.set('incidentId', incidentId)
    formData.set('reason', reason)
    formData.set('escalateTo', escalateTo)
    const res = await escalateReport(null, formData)
    setResult(res)
    setSubmitting(false)
    if (res?.success) {
      setTimeout(() => { setOpen(false); setResult(null); setReason(''); onSuccess() }, 2000)
    }
  }

  return (
    <>
      <button
        onClick={() => canEscalate ? setOpen(true) : null}
        disabled={!canEscalate}
        className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl p-3 flex items-center gap-3 hover:border-amber-500/20 hover:bg-amber-500/[0.02] transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
        title={!canEscalate ? (cooldownDays > 0 ? `Next escalation in ${cooldownDays}d` : 'Cannot escalate') : ''}
      >
        <Scale className="w-4 h-4 text-gray-500 group-hover:text-amber-400 transition-colors" />
        <div className="flex-1">
          <span className="text-xs text-gray-400 group-hover:text-white transition-colors">Escalate Report</span>
          {!canEscalate && cooldownDays > 0 && <p className="text-[9px] text-gray-600 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> Available in {cooldownDays}d</p>}
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
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">⚖️ Escalate Report</h3>
                {result?.error && <p className="text-xs text-red-400 mb-3 bg-red-500/10 p-2 rounded-lg border border-red-500/20">{result.error}</p>}

                <p className="text-xs text-gray-400 mb-4">Escalate to a senior officer for review</p>

                <div className="space-y-2 mb-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Escalate to:</p>
                  {[
                    { value: 'si', label: 'Sub Inspector (SI)' },
                    { value: 'sho', label: 'Station House Officer (SHO)' },
                    { value: 'dsp', label: 'DSP / Area Commander' },
                  ].map(opt => (
                    <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      escalateTo === opt.value ? 'bg-orange-500/10 border-orange-500/30' : 'bg-[#0D1420] border-[#1F2D42] hover:border-[#2A3A52]'
                    }`}>
                      <input type="radio" name="escalateTo" value={opt.value} checked={escalateTo === opt.value} onChange={e => setEscalateTo(e.target.value)}
                        className="w-4 h-4 accent-orange-500" />
                      <span className="text-xs text-white">{opt.label}</span>
                    </label>
                  ))}
                </div>

                <div className="mb-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">Reason for escalation * (min 30 chars)</p>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Example: No progress in 30 days, Officer unresponsive..."
                    maxLength={1000}
                    rows={3}
                    className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-orange-500/40 transition-colors resize-none"
                  />
                  <p className="text-[9px] text-gray-600 mt-1">{reason.length}/1000 chars {reason.length < 30 && reason.length > 0 && `(${30 - reason.length} more needed)`}</p>
                </div>

                <div className="flex items-start gap-2 p-2.5 bg-amber-500/5 rounded-lg border border-amber-500/10 mb-4">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-400/80">You can only escalate once every 7 days.</p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setOpen(false)} className="flex-1 text-sm text-gray-400 border border-[#1F2D42] rounded-xl py-2.5 hover:text-white hover:border-[#2A3A52] transition-colors">Cancel</button>
                  <button onClick={handleSubmit} disabled={submitting || reason.length < 30} className="flex-1 text-sm font-semibold bg-amber-500 text-black rounded-xl py-2.5 hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Escalate Report
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
