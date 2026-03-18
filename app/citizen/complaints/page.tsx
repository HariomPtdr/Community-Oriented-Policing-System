'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ComplaintsPage() {
  const [isAnonymous, setIsAnonymous] = useState(true)

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-heading font-bold text-white mb-2">
        Feedback / Shikayat <span className="text-orange-400 font-hindi">(शिकायत)</span>
      </h1>
      <p className="text-gray-400 text-sm mb-8">
        File a complaint about police conduct. Your complaint will be reviewed by an independent oversight board.
      </p>

      <div className="bg-green-900/20 border border-green-800/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <span className="text-lg">🔒</span>
        <div>
          <p className="text-green-400 text-sm font-semibold">Your identity is fully protected</p>
          <p className="text-gray-400 text-xs mt-1">Complaints are reviewed independently. Filing cannot result in retaliation.</p>
        </div>
      </div>

      <form className="space-y-5">
        <div>
          <label className="cops-section-title">Officer Name or Badge Number</label>
          <input placeholder="Enter officer name or badge number" className="cops-input" />
        </div>

        <div>
          <label className="cops-section-title">Complaint Category</label>
          <select className="cops-input">
            <option>Choose category...</option>
            <option>Misconduct</option>
            <option>Excessive force</option>
            <option>Negligence</option>
            <option>Corruption</option>
            <option>Harassment</option>
            <option>Delay in response</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label className="cops-section-title">Describe the Incident</label>
          <textarea placeholder="Describe what happened in detail..." rows={5} className="cops-input resize-none" />
        </div>

        <label className="flex items-center gap-3 text-gray-300 cursor-pointer">
          <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)}
            className="w-4 h-4" />
          <div>
            <span className="text-sm">Submit anonymously</span>
            <p className="text-xs text-gray-500">🔒 Your identity will be hidden from all officers</p>
          </div>
        </label>

        <button type="button" className="w-full cops-btn-primary py-3 text-base">
          Submit Complaint
        </button>
      </form>
    </div>
  )
}
