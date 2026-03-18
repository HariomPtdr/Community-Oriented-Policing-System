'use client'

import { ArrowLeft, RefreshCw, AlertTriangle, Ban, Truck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FIRDetailData } from '@/lib/validations/fir-tracking'
import { StatusTimeline } from './StatusTimeline'
import { AssignedOfficerCard } from './AssignedOfficerCard'
import { FIRDocumentCard } from './FIRDocumentCard'
import { EvidenceMediaCard } from './EvidenceMediaCard'
import { CaseUpdatesCard } from './CaseUpdatesCard'
import { RequestUpdateDialog } from './RequestUpdateDialog'
import { EscalateDialog } from './EscalateDialog'
import { FeedbackCard } from './FeedbackCard'
import { ReportDetailsCard } from './ReportDetailsCard'

export function FIRDetailShell({ data, onRefresh }: { data: FIRDetailData; onRefresh: () => void }) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const { incident } = data
  const staleDays = Math.floor((Date.now() - new Date(incident.updated_at).getTime()) / 86400000)

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/citizen/my-reports')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to My Reports
        </button>
        <button onClick={handleRefresh} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white bg-[#111827] border border-[#1F2D42] px-3.5 py-2 rounded-xl transition-all hover:border-[#2A3A52]">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* FIR Header Card */}
      <div className="bg-gradient-to-r from-[#111827] via-[#131D2E] to-[#111827] border border-[#1F2D42] rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">{incident.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {incident.fir_number && (
                <span className="text-xs font-mono bg-orange-500/10 text-orange-400 px-2.5 py-1 rounded-lg border border-orange-500/20">
                  FIR: {incident.fir_number}
                </span>
              )}
              <span className="text-xs font-mono text-gray-500">{incident.id.slice(0, 12)}...</span>
              <span className="text-xs text-gray-500 capitalize">{incident.category?.replace(/_/g, ' ')}</span>
            </div>
          </div>
          <StatusBadge status={incident.status} />
        </div>
      </div>

      {/* Banners */}
      {incident.status === 'rejected' && (
        <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl mb-4">
          <Ban className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-400 font-semibold">Report Rejected</p>
            <p className="text-xs text-gray-400 mt-0.5">{incident.rejection_reason || 'Please contact your nearest police station for assistance.'}</p>
          </div>
        </div>
      )}
      {incident.escalation_level && (
        <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl mb-4">
          <Truck className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-400 font-semibold">Escalated to {String(incident.escalation_level).toUpperCase()} Level</p>
            <p className="text-xs text-gray-400 mt-0.5">This case has been escalated for higher-level attention.</p>
          </div>
        </div>
      )}
      {staleDays > 7 && !['resolved','closed','rejected'].includes(incident.status) && (
        <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-400">No updates for {staleDays} days. Consider escalating or requesting an update.</p>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT PANEL (60%) */}
        <div className="lg:col-span-3 space-y-6">
          <StatusTimeline incident={incident} statusHistory={data.statusHistory} />
          <CaseUpdatesCard updates={data.caseUpdates} />
          <ReportDetailsCard incident={incident} />
        </div>

        {/* RIGHT PANEL (40%) */}
        <div className="lg:col-span-2 space-y-6">
          <AssignedOfficerCard officer={data.assignedOfficer} />
          <FIRDocumentCard incident={incident} firDocument={data.firDocument} />
          <EvidenceMediaCard evidence={data.evidence} canAdd={data.canAddEvidence} incidentId={incident.id} onRefresh={onRefresh} />

          {/* Action Buttons */}
          {!['rejected'].includes(incident.status) && (
            <div className="space-y-3">
              <RequestUpdateDialog incidentId={incident.id} canRequest={data.canRequestUpdate} lastRequest={data.lastStatusRequest} onSuccess={onRefresh} />
              <EscalateDialog incidentId={incident.id} canEscalate={data.canEscalate} lastEscalation={data.lastEscalation} onSuccess={onRefresh} />
            </div>
          )}

          {data.canSubmitFeedback && <FeedbackCard incidentId={incident.id} existingFeedback={data.existingFeedback} onSuccess={onRefresh} />}
          {data.existingFeedback && !data.canSubmitFeedback && (
            <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-400 text-sm font-semibold">✓ Feedback Submitted</span>
              </div>
              <div className="flex gap-1 mb-2">
                {[1,2,3,4,5].map(s => <span key={s} className={`text-lg ${s <= data.existingFeedback!.rating ? 'text-amber-400' : 'text-gray-700'}`}>★</span>)}
              </div>
              {data.existingFeedback.comment && <p className="text-xs text-gray-400">{data.existingFeedback.comment}</p>}
              <p className="text-[10px] text-gray-600 mt-2">Submitted {new Date(data.existingFeedback.submitted_at).toLocaleDateString('en-IN')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; label: string }> = {
    submitted: { color: 'text-orange-400', bg: 'bg-orange-500/15', label: 'Submitted' },
    under_review: { color: 'text-blue-400', bg: 'bg-blue-500/15', label: 'Under Review' },
    assigned: { color: 'text-purple-400', bg: 'bg-purple-500/15', label: 'Assigned' },
    in_progress: { color: 'text-yellow-400', bg: 'bg-yellow-500/15', label: 'In Progress' },
    evidence_collection: { color: 'text-cyan-400', bg: 'bg-cyan-500/15', label: 'Evidence Collection' },
    accused_identified: { color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'Accused Identified' },
    accused_arrested: { color: 'text-red-400', bg: 'bg-red-500/15', label: 'Accused Arrested' },
    charge_sheet_filed: { color: 'text-indigo-400', bg: 'bg-indigo-500/15', label: 'Charge Sheet Filed' },
    resolved: { color: 'text-green-400', bg: 'bg-green-500/15', label: 'Resolved' },
    closed: { color: 'text-gray-400', bg: 'bg-gray-500/15', label: 'Closed' },
    rejected: { color: 'text-red-400', bg: 'bg-red-500/15', label: 'Rejected' },
  }
  const c = config[status] || config.submitted
  return <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${c.color} ${c.bg} uppercase tracking-wider`}>{c.label}</span>
}
