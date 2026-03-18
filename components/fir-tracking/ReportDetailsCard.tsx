'use client'

import { FileText, MapPin, Calendar, Hash, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { IncidentWithDetails } from '@/lib/validations/fir-tracking'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function ReportDetailsCard({ incident }: { incident: IncidentWithDetails }) {
  const [expanded, setExpanded] = useState(false)
  const desc = incident.detailed_description || incident.description

  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-6">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5 text-orange-400" /> Report Details
      </h4>

      <div className="bg-[#0D1420] rounded-xl p-4 space-y-4">
        {/* Description */}
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Description</p>
          <p className="text-[13px] text-gray-300 leading-relaxed">
            {expanded || desc.length <= 200 ? desc : desc.slice(0, 200) + '...'}
          </p>
          {desc.length > 200 && (
            <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-orange-400 mt-1 flex items-center gap-0.5 hover:underline">
              {expanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
            </button>
          )}
        </div>

        {/* Location */}
        {incident.location_description && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[13px] text-gray-300">{incident.location_description}</span>
          </div>
        )}

        {/* Grid info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#1F2D42]">
          <div>
            <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Filed On</p>
            <p className="text-xs text-gray-300">{formatDate(incident.created_at)}</p>
          </div>
          <div>
            <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Last Update</p>
            <p className="text-xs text-gray-300">{timeAgo(incident.updated_at)}</p>
          </div>
          <div>
            <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Category</p>
            <p className="text-xs text-gray-300 capitalize">{incident.category?.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5 flex items-center gap-1"><Hash className="w-3 h-3" /> Report ID</p>
            <p className="text-xs text-gray-300 font-mono">{incident.id.slice(0, 12)}...</p>
          </div>
        </div>

        {/* Type-Specific Details */}
        {incident.complaint_type && (
          <div className="pt-3 border-t border-[#1F2D42]">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Complaint Type Details</p>
            <TypeSpecificDetails incident={incident} />
          </div>
        )}

        {/* Financial Details */}
        {(incident.your_loss_amount || incident.total_estimated_loss) && (
          <div className="pt-3 border-t border-[#1F2D42]">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Recovery Status</p>
            <div className="grid grid-cols-3 gap-2">
              {incident.your_loss_amount && (
                <div className="bg-[#111827] rounded-lg p-2.5 text-center">
                  <p className="text-[9px] text-gray-500 uppercase">Your Loss</p>
                  <p className="text-xs text-red-400 font-mono font-semibold">₹{Number(incident.your_loss_amount).toLocaleString('en-IN')}</p>
                </div>
              )}
              {incident.total_estimated_loss && (
                <div className="bg-[#111827] rounded-lg p-2.5 text-center">
                  <p className="text-[9px] text-gray-500 uppercase">Total Est.</p>
                  <p className="text-xs text-amber-400 font-mono font-semibold">₹{Number(incident.total_estimated_loss).toLocaleString('en-IN')}</p>
                </div>
              )}
              {incident.total_recovered_value != null && (
                <div className="bg-[#111827] rounded-lg p-2.5 text-center">
                  <p className="text-[9px] text-gray-500 uppercase">Recovered</p>
                  <p className="text-xs text-green-400 font-mono font-semibold">₹{Number(incident.total_recovered_value).toLocaleString('en-IN')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resolution Notes */}
        {incident.resolution_notes && (
          <div className="pt-3 border-t border-[#1F2D42]">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Resolution Notes</p>
            <p className="text-[13px] text-green-400/80 bg-green-500/5 p-3 rounded-lg border border-green-500/10">{incident.resolution_notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function TypeSpecificDetails({ incident }: { incident: IncidentWithDetails }) {
  const type = incident.complaint_type

  if (type === 'simple_theft' && incident.simple_theft) {
    const d = incident.simple_theft as Record<string, any>
    return (
      <div className="grid grid-cols-2 gap-2 text-xs">
        {d.property_type && <DetailItem label="Property Type" value={String(d.property_type).replace(/_/g, ' ')} />}
        {d.property_description && <DetailItem label="Description" value={d.property_description} span />}
        {d.estimated_price && <DetailItem label="Estimated Value" value={`₹${Number(d.estimated_price).toLocaleString('en-IN')}`} />}
        {d.suspect_name && <DetailItem label="Suspect" value={d.suspect_name} />}
      </div>
    )
  }
  if (type === 'cyber_crime' && incident.cyber_crime) {
    const d = incident.cyber_crime as Record<string, any>
    return (
      <div className="grid grid-cols-2 gap-2 text-xs">
        {d.cyber_type && <DetailItem label="Cyber Crime Type" value={String(d.cyber_type).replace(/_/g, ' ')} />}
        {d.amount_lost && <DetailItem label="Amount Lost" value={`₹${Number(d.amount_lost).toLocaleString('en-IN')}`} />}
        {d.platform_used?.length > 0 && <DetailItem label="Platforms" value={d.platform_used.join(', ')} span />}
        {d.transaction_id && <DetailItem label="Transaction ID" value={d.transaction_id} />}
      </div>
    )
  }
  if (type === 'cheating_fraud' && incident.cheating_fraud) {
    const d = incident.cheating_fraud as Record<string, any>
    return (
      <div className="grid grid-cols-2 gap-2 text-xs">
        {d.fraud_type && <DetailItem label="Fraud Type" value={String(d.fraud_type).replace(/_/g, ' ')} />}
        {d.fraud_amount && <DetailItem label="Amount" value={`₹${Number(d.fraud_amount).toLocaleString('en-IN')}`} />}
        {d.payment_method && <DetailItem label="Payment Method" value={String(d.payment_method).replace(/_/g, ' ')} />}
        {d.suspect_name && <DetailItem label="Suspect" value={d.suspect_name} />}
      </div>
    )
  }
  if (type === 'burglary' && incident.burglary) {
    const d = incident.burglary as Record<string, any>
    return (
      <div className="grid grid-cols-2 gap-2 text-xs">
        {d.premises_type && <DetailItem label="Premises" value={String(d.premises_type).replace(/_/g, ' ')} />}
        {d.entry_method && <DetailItem label="Entry Method" value={String(d.entry_method).replace(/_/g, ' ')} />}
        <DetailItem label="CCTV" value={d.cctv_available ? 'Available' : 'Not Available'} />
        {d.estimated_value && <DetailItem label="Est. Value" value={`₹${Number(d.estimated_value).toLocaleString('en-IN')}`} />}
      </div>
    )
  }
  if (type === 'ncr' && incident.ncr) {
    const d = incident.ncr as Record<string, any>
    return (
      <div className="grid grid-cols-2 gap-2 text-xs">
        {d.ncr_type && <DetailItem label="NCR Type" value={String(d.ncr_type).replace(/_/g, ' ')} />}
        {d.description && <DetailItem label="Details" value={d.description} span />}
      </div>
    )
  }
  return <p className="text-[11px] text-gray-600 capitalize">{type?.replace(/_/g, ' ')}</p>
}

function DetailItem({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <p className="text-[9px] text-gray-600 uppercase tracking-wider">{label}</p>
      <p className="text-gray-300 capitalize mt-0.5">{value}</p>
    </div>
  )
}
