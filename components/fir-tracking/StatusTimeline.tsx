'use client'

import { FileText, Eye, Shield, FileSearch, Briefcase, UserCircle, Handshake, Gavel, CheckCircle, FolderClosed, Ban, Radar } from 'lucide-react'

const FIR_STATUS_STEPS = [
  { key: 'submitted', label: 'FIR Submitted', icon: FileText, desc: 'Report received and pending review', estimate: '' },
  { key: 'under_review', label: 'Under Review', icon: Eye, desc: 'Being reviewed by desk officer', estimate: 'Typical review takes 1-3 business days' },
  { key: 'assigned', label: 'Officer Assigned', icon: Shield, desc: 'I/O and F/O assigned to case', estimate: 'Typical assignment takes 1-2 business days' },
  { key: 'in_progress', label: 'Under Investigation', icon: FileSearch, desc: 'Active investigation in progress', estimate: 'Investigation timeline varies by case complexity' },
  { key: 'evidence_collection', label: 'Evidence Collection', icon: Briefcase, desc: 'Collecting evidence and statements', estimate: 'Evidence collection may take 1-4 weeks' },
  { key: 'accused_identified', label: 'Accused Identified', icon: UserCircle, desc: 'Suspect(s) have been identified', estimate: '' },
  { key: 'accused_arrested', label: 'Accused Arrested', icon: Handshake, desc: 'Suspect(s) taken into custody', estimate: '' },
  { key: 'charge_sheet_filed', label: 'Charge Sheet Filed', icon: Gavel, desc: 'Charge sheet submitted to court', estimate: '' },
  { key: 'resolved', label: 'Case Resolved', icon: CheckCircle, desc: 'Case resolved successfully', estimate: '' },
  { key: 'closed', label: 'Case Closed', icon: FolderClosed, desc: 'Case officially closed', estimate: '' },
]

function getStatusIndex(status: string) {
  const idx = FIR_STATUS_STEPS.findIndex(s => s.key === status)
  if (idx >= 0) return idx
  if (status === 'under_investigation') return 3
  return 0
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function StatusTimeline({ incident, statusHistory }: { incident: any; statusHistory: any[] }) {
  const currentStatusIdx = getStatusIndex(incident.status)
  const isRejected = incident.status === 'rejected'

  // Build timestamp map from statusHistory
  const statusTimestamps: Record<string, { time: string; by?: string; role?: string }> = {}
  for (const h of statusHistory) {
    statusTimestamps[h.new_status] = {
      time: h.changed_at,
      by: h.changed_by_name,
      role: h.changed_by_role,
    }
  }

  if (isRejected) {
    return (
      <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Radar className="w-4 h-4 text-orange-400" /> FIR Tracking — Status Timeline
          </h3>
          <span className="text-[10px] text-gray-500">Updated {timeAgo(incident.updated_at)}</span>
        </div>
        <div className="relative ml-1 space-y-0">
          {/* Submitted step */}
          <div className="flex items-start gap-4 relative">
            <div className="absolute left-[17px] top-[38px] w-0.5 h-[calc(100%-14px)] bg-red-500/40" />
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 bg-green-500/20 border-green-500/60 text-green-400">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="pb-6">
              <p className="text-[13px] font-medium text-white">FIR Submitted</p>
              <p className="text-[11px] text-gray-400">{statusTimestamps['submitted'] ? formatDateTime(statusTimestamps['submitted'].time) : formatDateTime(incident.created_at)}</p>
            </div>
          </div>
          {/* Rejected step */}
          <div className="flex items-start gap-4 relative">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 bg-red-500/20 border-red-500 text-red-400 ring-4 ring-red-500/10">
              <Ban className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-red-400">
                Complaint Rejected
                <span className="ml-2 text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold uppercase">Final</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{incident.rejection_reason || 'Your complaint could not be registered as FIR.'}</p>
              {statusTimestamps['rejected'] && (
                <p className="text-[10px] text-gray-600 mt-1">{formatDateTime(statusTimestamps['rejected'].time)}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Radar className="w-4 h-4 text-orange-400" /> FIR Tracking — Status Timeline
        </h3>
        <span className="text-[10px] text-gray-500">Updated {timeAgo(incident.updated_at)}</span>
      </div>
      <div className="relative ml-1">
        {FIR_STATUS_STEPS.map((step, i) => {
          const isCompleted = i < currentStatusIdx
          const isCurrent = i === currentStatusIdx
          const isNext = i === currentStatusIdx + 1
          const StepIcon = step.icon

          return (
            <div key={step.key} className="flex items-start gap-4 relative">
              {i < FIR_STATUS_STEPS.length - 1 && (
                <div className={`absolute left-[17px] top-[38px] w-0.5 h-[calc(100%-14px)] transition-colors ${
                  isCompleted ? 'bg-green-500/60' : isCurrent ? 'bg-orange-500/30' : 'bg-[#1F2D42]'
                }`} />
              )}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                isCurrent
                  ? 'bg-orange-500/20 border-orange-500 text-orange-400 ring-4 ring-orange-500/10 animate-pulse'
                  : isCompleted
                  ? 'bg-green-500/20 border-green-500/60 text-green-400'
                  : isNext
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400/70'
                  : 'bg-[#0D1420] border-[#1F2D42] text-gray-700'
              }`}>
                <StepIcon className="w-3.5 h-3.5" />
              </div>
              <div className={`pb-6 ${i === FIR_STATUS_STEPS.length - 1 ? 'pb-0' : ''}`}>
                <p className={`text-[13px] font-medium ${
                  isCurrent ? 'text-orange-400' : isCompleted ? 'text-white' : isNext ? 'text-blue-400/70' : 'text-gray-600'
                }`}>
                  {step.label}
                  {isCurrent && (
                    <span className="ml-2 text-[9px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold uppercase">Current</span>
                  )}
                </p>
                <p className={`text-[11px] mt-0.5 ${isCompleted || isCurrent ? 'text-gray-400' : 'text-gray-600'}`}>{step.desc}</p>
                {(isCompleted || isCurrent) && statusTimestamps[step.key] && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    {formatDateTime(statusTimestamps[step.key].time)}
                    {statusTimestamps[step.key].by && ` · ${statusTimestamps[step.key].by}`}
                  </p>
                )}
                {isCurrent && step.estimate && (
                  <p className="text-[10px] text-blue-400/60 mt-1 italic">{step.estimate}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
