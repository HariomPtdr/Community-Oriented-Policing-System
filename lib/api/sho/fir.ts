import { createClient } from '@/lib/supabase/client'

// ── Module 2: FIR Management API ──────────────────────────

// Load FIR registry with aging indicators
export const loadFIRRegistry = async (stationId: string, filters: any = {}) => {
  const supabase = createClient()
  let q = supabase
    .from('fir_records')
    .select(`
      id, fir_number, case_status, days_open,
      registered_at, last_activity_at,
      has_pending_closure, has_citizen_concern, concern_resolved,
      legal_sections, priority_score, recovery_status,
      financial_loss_amt, financial_recovered,
      closure_type, court_case_number, next_hearing_date,
      complaints!complaint_id(
        category, complainant_name, incident_location
      ),
      officer_profiles!io_id(full_name, rank, duty_status, badge_number)
    `)
    .eq('station_id', stationId)
    .order('last_activity_at', { ascending: true }) // most stagnant first

  if (filters.status) q = q.eq('case_status', filters.status)
  if (filters.io_id) q = q.eq('io_id', filters.io_id)
  if (filters.excludeClosed !== false) q = q.not('case_status', 'in', '("CASE_CLOSED","CHARGE_SHEET_FILED")')
  if (filters.search) {
    q = q.or(`fir_number.ilike.%${filters.search}%`)
  }
  return q
}

// Load complete FIR detail with all related data
export const loadFIRDetail = async (firId: string) => {
  const supabase = createClient()
  const results = await Promise.all([
    // FIR Record + complaint + citizen + IO
    supabase.from('fir_records').select(`
      *,
      complaints!complaint_id(
        *, citizen_profiles!citizen_id(*)
      ),
      officer_profiles!io_id(full_name, rank, badge_number, specialization, duty_status)
    `).eq('id', firId).single(),

    // Investigation timeline
    supabase.from('investigation_log')
      .select('*, officer_profiles!officer_id(full_name, rank)')
      .eq('fir_id', firId)
      .order('created_at', { ascending: false }),

    // Tasks
    supabase.from('investigation_tasks')
      .select('*, officer_profiles!assigned_to(full_name, rank, badge_number)')
      .eq('fir_id', firId)
      .order('due_at', { ascending: true }),

    // Evidence
    supabase.from('evidence_files')
      .select('*, officer_profiles!uploaded_by(full_name, rank)')
      .eq('fir_id', firId)
      .eq('is_deleted', false),

    // Citizen concerns
    supabase.from('citizen_concerns')
      .select('*')
      .eq('fir_id', firId)
      .order('created_at', { ascending: false }),

    // Supervisor notes
    supabase.from('supervisor_notes')
      .select('*, officer_profiles!author_id(full_name, rank)')
      .eq('fir_id', firId)
      .order('created_at', { ascending: false }),

    // Closure requests
    supabase.from('closure_requests')
      .select('*')
      .eq('fir_id', firId)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  return {
    fir: results[0],
    timeline: results[1],
    tasks: results[2],
    evidence: results[3],
    concerns: results[4],
    notes: results[5],
    closureRequests: results[6],
  }
}

// Update FIR case status
export const updateFIRStatus = async (firId: string, newStatus: string) => {
  const supabase = createClient()
  return supabase.from('fir_records')
    .update({ case_status: newStatus })
    .eq('id', firId)
}

// Reassign Investigating Officer
export const reassignIO = async (
  firId: string,
  fromOfficerId: string,
  toOfficerId: string,
  reason: string,
  reassignedBy: string
) => {
  const supabase = createClient()
  // Create reassignment record
  await supabase.from('io_reassignments').insert({
    fir_id: firId,
    from_officer_id: fromOfficerId,
    to_officer_id: toOfficerId,
    reason,
    reassigned_by: reassignedBy,
  })

  // Update FIR
  return supabase.from('fir_records')
    .update({ io_id: toOfficerId })
    .eq('id', firId)
}

// Add supervisor note
export const addSupervisorNote = async (
  firId: string,
  authorId: string,
  noteText: string
) => {
  const supabase = createClient()
  return supabase.from('supervisor_notes').insert({
    fir_id: firId,
    author_id: authorId,
    note_text: noteText,
  })
}

// Amend legal sections
export const amendSection = async (
  firId: string,
  amendedBy: string,
  action: 'ADDED' | 'REMOVED',
  section: string,
  justification: string
) => {
  const supabase = createClient()
  // Record amendment
  await supabase.from('section_amendments').insert({
    fir_id: firId,
    amended_by: amendedBy,
    action,
    section,
    justification,
  })

  // Get current sections
  const { data: fir } = await supabase
    .from('fir_records')
    .select('legal_sections')
    .eq('id', firId)
    .single()

  if (!fir) return { error: { message: 'FIR not found' } }

  let sections = fir.legal_sections || []
  if (action === 'ADDED') {
    sections = [...sections, section]
  } else {
    sections = sections.filter((s: string) => s !== section)
  }

  return supabase.from('fir_records')
    .update({ legal_sections: sections })
    .eq('id', firId)
}

// Override location verification (requires reauth)
export const overrideVerification = async (
  taskId: string,
  verificationId: string,
  reason: string,
  shoId: string
) => {
  if (reason.length < 50) {
    return { error: { message: 'Override reason must be at least 50 characters' } }
  }
  const supabase = createClient()
  const now = new Date().toISOString()

  await supabase.from('location_verifications').update({
    sho_override: true,
    sho_override_reason: reason,
    sho_override_by: shoId,
    sho_override_at: now,
  }).eq('id', verificationId)

  return supabase.from('investigation_tasks').update({
    status: 'COMPLETED',
    sho_override: true,
    sho_override_reason: reason,
    sho_override_by: shoId,
    sho_override_at: now,
  }).eq('id', taskId)
}

// Authorize case closure (requires reauth)
export const authorizeClosure = async (
  closureRequestId: string,
  firId: string,
  shoId: string
) => {
  const supabase = createClient()
  const now = new Date().toISOString()

  await supabase.from('closure_requests').update({
    status: 'APPROVED',
    reviewed_by: shoId,
    reviewed_at: now,
  }).eq('id', closureRequestId)

  return supabase.from('fir_records').update({
    case_status: 'CASE_CLOSED',
    closure_authorized_by: shoId,
    has_pending_closure: false,
    closed_at: now,
  }).eq('id', firId)
}

// Reject closure request
export const rejectClosure = async (
  closureRequestId: string,
  firId: string,
  shoId: string,
  reason: string
) => {
  const supabase = createClient()
  await supabase.from('closure_requests').update({
    status: 'REJECTED',
    reviewed_by: shoId,
    reviewed_at: new Date().toISOString(),
    rejection_reason: reason,
  }).eq('id', closureRequestId)

  return supabase.from('fir_records')
    .update({ has_pending_closure: false })
    .eq('id', firId)
}

// Respond to citizen concern
export const respondToConcern = async (
  concernId: string,
  shoId: string,
  response: string,
  resolutionType: string
) => {
  const supabase = createClient()
  return supabase.from('citizen_concerns').update({
    status: 'ACTIONED',
    sho_response: response,
    resolution_type: resolutionType,
    responded_by: shoId,
    responded_at: new Date().toISOString(),
  }).eq('id', concernId)
}

// Get FIR summary stats
export const getFIRStats = async (stationId: string) => {
  const supabase = createClient()
  const { data } = await supabase
    .from('fir_records')
    .select('id, case_status, days_open, has_pending_closure, has_citizen_concern, concern_resolved, last_activity_at')
    .eq('station_id', stationId)
    .not('case_status', 'in', '("CASE_CLOSED","CHARGE_SHEET_FILED")')

  if (!data) return { active: 0, onTrack: 0, needsAttention: 0, critical: 0, closurePending: 0 }

  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  return {
    active: data.length,
    onTrack: data.filter(f => (f.days_open || 0) < 30).length,
    needsAttention: data.filter(f => (f.days_open || 0) >= 30 && (f.days_open || 0) < 60).length,
    critical: data.filter(f => (f.days_open || 0) >= 60).length,
    closurePending: data.filter(f => f.has_pending_closure).length,
    concernsPending: data.filter(f => f.has_citizen_concern && !f.concern_resolved).length,
    stagnant: data.filter(f => {
      if (!f.last_activity_at) return true
      return now - new Date(f.last_activity_at).getTime() > 14 * dayMs
    }).length,
  }
}
