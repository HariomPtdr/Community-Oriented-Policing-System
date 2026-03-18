'use client'

import { Star, Loader2, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { submitCaseFeedback } from '@/app/citizen/my-reports/[incidentId]/actions'

export function FeedbackCard({ incidentId, existingFeedback, onSuccess }: {
  incidentId: string; existingFeedback: any; onSuccess: () => void
}) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [responsive, setResponsive] = useState<boolean | null>(null)
  const [satisfactory, setSatisfactory] = useState<boolean | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)

  if (existingFeedback) return null

  const handleSubmit = async () => {
    if (rating === 0 || responsive === null || satisfactory === null) return
    setSubmitting(true)
    const formData = new FormData()
    formData.set('incidentId', incidentId)
    formData.set('rating', String(rating))
    formData.set('wasOfficerResponsive', String(responsive))
    formData.set('wasResolutionSatisfactory', String(satisfactory))
    if (comment) formData.set('comment', comment)
    const res = await submitCaseFeedback(null, formData)
    setResult(res)
    setSubmitting(false)
    if (res?.success) setTimeout(onSuccess, 2000)
  }

  if (result?.success) {
    return (
      <div className="bg-[#111827] border border-green-500/20 rounded-xl p-5 text-center">
        <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
        <p className="text-sm text-green-400 font-medium">Thank you for your feedback ✓</p>
        {rating <= 2 && (
          <p className="text-[10px] text-gray-400 mt-2">We&apos;re sorry to hear that. Your feedback has been shared with the station supervisor.</p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-5">
      <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
        <Star className="w-4 h-4 text-amber-400" /> How was your experience?
      </h4>
      <p className="text-[10px] text-gray-500 mb-4">Help us improve by rating this case resolution</p>

      {result?.error && <p className="text-xs text-red-400 mb-3 bg-red-500/10 p-2 rounded-lg border border-red-500/20">{result.error}</p>}

      {/* Star rating */}
      <div className="flex gap-1 mb-4">
        {[1,2,3,4,5].map(s => (
          <button key={s} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(s)}
            className="text-2xl transition-transform hover:scale-110">
            <span className={s <= (hoverRating || rating) ? 'text-amber-400' : 'text-gray-700'}>★</span>
          </button>
        ))}
      </div>

      {/* Yes/No questions */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-300">Was the officer responsive?</p>
          <div className="flex gap-2">
            <button onClick={() => setResponsive(true)} className={`text-[10px] px-3 py-1 rounded-lg border font-medium transition-all ${responsive === true ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-[#0D1420] border-[#1F2D42] text-gray-500'}`}>Yes</button>
            <button onClick={() => setResponsive(false)} className={`text-[10px] px-3 py-1 rounded-lg border font-medium transition-all ${responsive === false ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-[#0D1420] border-[#1F2D42] text-gray-500'}`}>No</button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-300">Satisfied with resolution?</p>
          <div className="flex gap-2">
            <button onClick={() => setSatisfactory(true)} className={`text-[10px] px-3 py-1 rounded-lg border font-medium transition-all ${satisfactory === true ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-[#0D1420] border-[#1F2D42] text-gray-500'}`}>Yes</button>
            <button onClick={() => setSatisfactory(false)} className={`text-[10px] px-3 py-1 rounded-lg border font-medium transition-all ${satisfactory === false ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-[#0D1420] border-[#1F2D42] text-gray-500'}`}>No</button>
          </div>
        </div>
      </div>

      <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Additional comments (optional)..." maxLength={1000} rows={2}
        className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-orange-500/40 transition-colors resize-none mb-4" />

      <button onClick={handleSubmit} disabled={submitting || rating === 0 || responsive === null || satisfactory === null}
        className="w-full text-sm font-semibold bg-orange-500 text-black rounded-xl py-2.5 hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Submit Feedback
      </button>
    </div>
  )
}
