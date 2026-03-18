import { z } from 'zod'

export const requestStatusUpdateSchema = z.object({
  incidentId: z.string().uuid(),
  message: z.string()
    .max(500, 'Message too long')
    .optional(),
})

export const escalateReportSchema = z.object({
  incidentId: z.string().uuid(),
  reason: z.string()
    .min(30, 'Please provide at least 30 characters explaining why you are escalating')
    .max(1000),
  escalateTo: z.enum(['si', 'sho', 'dsp']).default('sho'),
})

export const submitFeedbackSchema = z.object({
  incidentId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  wasOfficerResponsive: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean()
  ),
  wasResolutionSatisfactory: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean()
  ),
})

export const addEvidenceSchema = z.object({
  incidentId: z.string().uuid(),
  description: z.string().min(5).max(300).optional(),
  category: z.enum([
    'property_photo', 'proof', 'screenshot',
    'transaction_receipt', 'cctv_footage', 'other'
  ]),
})

// Full page data types
export interface OfficerInfo {
  full_name: string
  avatar_url: string | null
  badge_number: string
  rank: string
}

export interface FIRDocument {
  id: string
  incident_id: string
  generated_at: string
  storage_path: string
  file_size_bytes: number | null
  version: number
  is_current: boolean
  trigger_reason: string | null
}

export interface EvidenceFile {
  id: string
  incident_id: string
  uploaded_at: string
  uploaded_by: string
  storage_path: string
  public_url: string | null
  file_name: string
  file_size: number
  mime_type: string
  category: string
  signedUrl?: string
}

export interface StatusHistoryEntry {
  id: string
  incident_id: string
  changed_at: string
  changed_by: string | null
  old_status: string | null
  new_status: string
  note: string | null
  changed_by_name?: string
  changed_by_role?: string
}

export interface CaseUpdate {
  id: string
  incident_id: string
  created_at: string
  posted_by: string
  content: string
  is_public: boolean
  update_type: string
  poster_name?: string
  poster_role?: string
  poster_rank?: string
  poster_badge?: string
}

export interface StatusUpdateRequest {
  id: string
  incident_id: string
  requested_by: string
  requested_at: string
  message: string | null
  is_acknowledged: boolean
  acknowledged_by: string | null
  acknowledged_at: string | null
  response: string | null
}

export interface EscalationEntry {
  id: string
  incident_id: string
  escalated_by: string | null
  escalated_to: string | null
  from_role: string
  to_role: string
  reason: string | null
  citizen_reason: string | null
  citizen_initiated: boolean
  cooldown_until: string | null
  escalated_at: string
  created_at: string
}

export interface CaseFeedback {
  id: string
  incident_id: string
  citizen_id: string
  rating: number
  comment: string | null
  was_officer_responsive: boolean | null
  was_resolution_satisfactory: boolean | null
  submitted_at: string
  officer_response: string | null
  officer_responded_at: string | null
}

export interface IncidentWithDetails {
  id: string
  title: string
  description: string
  detailed_description: string | null
  category: string
  status: string
  priority: string
  is_anonymous: boolean
  reporter_id: string
  assigned_officer_id: string | null
  io_assigned_id: string | null
  fir_number: string | null
  complaint_type: string | null
  filing_mode: string | null
  station_id: string | null
  location_description: string | null
  latitude: number | null
  longitude: number | null
  occurred_at: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  resolution_notes: string | null
  escalation_level: string | null
  current_step: number | null
  c_full_name: string | null
  c_father_name: string | null
  c_mobile: string | null
  c_address: string | null
  c_district: string | null
  c_police_station: string | null
  i_district: string | null
  i_police_station: string | null
  i_state: string | null
  i_city: string | null
  i_date: string | null
  i_approx_time: string | null
  your_loss_amount: number | null
  total_estimated_loss: number | null
  total_recovered_value: number | null
  citizen_signature: string | null
  verified_at: string | null
  verified_by: string | null
  rejection_reason: string | null
  // Type-specific details (joined)
  simple_theft?: Record<string, unknown> | null
  cyber_crime?: Record<string, unknown> | null
  cheating_fraud?: Record<string, unknown> | null
  burglary?: Record<string, unknown> | null
  ncr?: Record<string, unknown> | null
}

export interface FIRDetailData {
  incident: IncidentWithDetails
  assignedOfficer: OfficerInfo | null
  firDocument: FIRDocument | null
  evidence: EvidenceFile[]
  statusHistory: StatusHistoryEntry[]
  caseUpdates: CaseUpdate[]
  lastStatusRequest: StatusUpdateRequest | null
  lastEscalation: EscalationEntry | null
  existingFeedback: CaseFeedback | null
  canRequestUpdate: boolean
  canEscalate: boolean
  canAddEvidence: boolean
  canSubmitFeedback: boolean
}
