'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  requestStatusUpdateSchema,
  escalateReportSchema,
  submitFeedbackSchema,
  type FIRDetailData,
  type IncidentWithDetails,
  type OfficerInfo,
  type FIRDocument,
  type EvidenceFile,
  type StatusHistoryEntry,
  type CaseUpdate,
  type StatusUpdateRequest,
  type EscalationEntry,
  type CaseFeedback
} from '@/lib/validations/fir-tracking'

// ── Action 1: Get all FIR detail data ────────────────────────────────
export async function getFIRDetailData(incidentId: string): Promise<FIRDetailData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. Get incident and verify ownership
  const { data: incident, error: incidentError } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', incidentId)
    .eq('reporter_id', user.id)
    .single()

  if (incidentError || !incident) {
    return null
  }

  // If draft, user should resume filing
  if (incident.status === 'draft') {
    redirect(`/citizen/report/${incidentId}/step${incident.current_step || 1}`)
  }

  // 2. Fetch all data in parallel
  const [
    officerResult,
    firDocResult,
    evidenceResult,
    statusHistoryResult,
    caseUpdatesResult,
    lastRequestResult,
    lastEscalationResult,
    feedbackResult,
    simpleTheftResult,
    cyberCrimeResult,
    cheatingFraudResult,
    burglaryResult,
    ncrResult,
  ] = await Promise.all([
    // a. Assigned officer profile
    incident.assigned_officer_id
      ? supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', incident.assigned_officer_id)
          .single()
          .then(async (profileRes) => {
            if (!profileRes.data) return null
            const { data: officerData } = await supabase
              .from('officer_profiles')
              .select('badge_number, rank')
              .eq('id', incident.assigned_officer_id)
              .single()
            if (!officerData) return null
            return {
              full_name: profileRes.data.full_name,
              avatar_url: profileRes.data.avatar_url,
              badge_number: officerData.badge_number,
              rank: officerData.rank,
            } as OfficerInfo
          })
      : Promise.resolve(null),

    // b. Current FIR document
    supabase
      .from('fir_documents')
      .select('*')
      .eq('incident_id', incidentId)
      .eq('is_current', true)
      .limit(1)
      .single()
      .then(res => res.data as FIRDocument | null),

    // c. Evidence files
    supabase
      .from('incident_evidence')
      .select('*')
      .eq('incident_id', incidentId)
      .order('uploaded_at', { ascending: true })
      .then(res => (res.data || []) as EvidenceFile[]),

    // d. Status history
    supabase
      .from('incident_status_history')
      .select('*')
      .eq('incident_id', incidentId)
      .order('changed_at', { ascending: true })
      .then(async (res) => {
        const history = (res.data || []) as StatusHistoryEntry[]
        // Enrich with changer names
        for (const h of history) {
          if (h.changed_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, role')
              .eq('id', h.changed_by)
              .single()
            if (profile) {
              h.changed_by_name = profile.full_name
              h.changed_by_role = profile.role
            }
          }
        }
        return history
      }),

    // e. Case updates (public only for citizen)
    supabase
      .from('case_updates')
      .select('*')
      .eq('incident_id', incidentId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .then(async (res) => {
        const updates = (res.data || []) as CaseUpdate[]
        for (const u of updates) {
          if (u.posted_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, role')
              .eq('id', u.posted_by)
              .single()
            if (profile) {
              u.poster_name = profile.full_name
              u.poster_role = profile.role
            }
            const { data: officerData } = await supabase
              .from('officer_profiles')
              .select('rank, badge_number')
              .eq('id', u.posted_by)
              .single()
            if (officerData) {
              u.poster_rank = officerData.rank
              u.poster_badge = officerData.badge_number
            }
          }
        }
        return updates
      }),

    // f. Last status update request
    supabase
      .from('status_update_requests')
      .select('*')
      .eq('incident_id', incidentId)
      .eq('requested_by', user.id)
      .order('requested_at', { ascending: false })
      .limit(1)
      .single()
      .then(res => res.data as StatusUpdateRequest | null),

    // g. Last escalation
    supabase
      .from('escalation_log')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(res => res.data as EscalationEntry | null),

    // h. Existing feedback
    supabase
      .from('case_feedback')
      .select('*')
      .eq('incident_id', incidentId)
      .eq('citizen_id', user.id)
      .limit(1)
      .single()
      .then(res => res.data as CaseFeedback | null),

    // Type-specific details
    supabase.from('incident_simple_theft').select('*').eq('incident_id', incidentId).single().then(r => r.data),
    supabase.from('incident_cyber_crime').select('*').eq('incident_id', incidentId).single().then(r => r.data),
    supabase.from('incident_cheating_fraud').select('*').eq('incident_id', incidentId).single().then(r => r.data),
    supabase.from('incident_burglary').select('*').eq('incident_id', incidentId).single().then(r => r.data),
    supabase.from('incident_ncr').select('*').eq('incident_id', incidentId).single().then(r => r.data),
  ])

  // Generate signed URLs for evidence files
  const evidenceWithUrls = await Promise.all(
    evidenceResult.map(async (ev) => {
      if (ev.storage_path) {
        try {
          const { data } = await supabase.storage
            .from('incident-evidence')
            .createSignedUrl(ev.storage_path, 3600)
          return { ...ev, signedUrl: data?.signedUrl || ev.public_url || undefined }
        } catch {
          return { ...ev, signedUrl: ev.public_url || undefined }
        }
      }
      return { ...ev, signedUrl: ev.public_url || undefined }
    })
  )

  // Compute derived flags
  const now = new Date()
  const canRequestUpdate = !lastRequestResult ||
    (now.getTime() - new Date(lastRequestResult.requested_at).getTime()) > 48 * 60 * 60 * 1000

  const canEscalate = !['resolved', 'closed', 'rejected'].includes(incident.status) &&
    (!lastEscalationResult ||
      (now.getTime() - new Date(lastEscalationResult.escalated_at || lastEscalationResult.created_at).getTime()) > 7 * 24 * 60 * 60 * 1000)

  const canAddEvidence = !['closed', 'rejected'].includes(incident.status)
  const canSubmitFeedback = ['resolved', 'closed'].includes(incident.status) && !feedbackResult

  const incidentWithDetails: IncidentWithDetails = {
    ...incident,
    simple_theft: simpleTheftResult,
    cyber_crime: cyberCrimeResult,
    cheating_fraud: cheatingFraudResult,
    burglary: burglaryResult,
    ncr: ncrResult,
  }

  return {
    incident: incidentWithDetails,
    assignedOfficer: officerResult,
    firDocument: firDocResult,
    evidence: evidenceWithUrls,
    statusHistory: statusHistoryResult,
    caseUpdates: caseUpdatesResult,
    lastStatusRequest: lastRequestResult,
    lastEscalation: lastEscalationResult,
    existingFeedback: feedbackResult,
    canRequestUpdate,
    canEscalate,
    canAddEvidence,
    canSubmitFeedback,
  }
}

// ── Action 2: Request status update ──────────────────────────────────
export async function requestStatusUpdate(
  _prevState: unknown,
  formData: FormData
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = {
    incidentId: formData.get('incidentId') as string,
    message: (formData.get('message') as string) || undefined,
  }

  const parsed = requestStatusUpdateSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }
  const input = parsed.data

  // Verify ownership
  const { data: incident } = await supabase
    .from('incidents')
    .select('id, status, assigned_officer_id, fir_number, station_id')
    .eq('id', input.incidentId)
    .eq('reporter_id', user.id)
    .single()

  if (!incident) return { error: 'Incident not found' }
  if (['closed', 'rejected'].includes(incident.status)) {
    return { error: 'Cannot request update on a closed or rejected case' }
  }

  // Rate limit check: 48 hours
  const { data: recentRequests } = await supabase
    .from('status_update_requests')
    .select('requested_at')
    .eq('incident_id', input.incidentId)
    .eq('requested_by', user.id)
    .order('requested_at', { ascending: false })
    .limit(1)

  if (recentRequests && recentRequests.length > 0) {
    const lastRequestTime = new Date(recentRequests[0].requested_at).getTime()
    const now = Date.now()
    if (now - lastRequestTime < 48 * 60 * 60 * 1000) {
      const nextAvailable = new Date(lastRequestTime + 48 * 60 * 60 * 1000)
      return {
        error: 'You already requested an update recently.',
        nextAvailableAt: nextAvailable.toISOString(),
      }
    }
  }

  // Insert request
  const { data: newRequest, error: insertError } = await supabase
    .from('status_update_requests')
    .insert({
      incident_id: input.incidentId,
      requested_by: user.id,
      message: input.message || null,
    })
    .select('id')
    .single()

  if (insertError) {
    return { error: 'Failed to submit request. Please try again.' }
  }

  // Notify assigned officer
  const notifyTarget = incident.assigned_officer_id
  if (notifyTarget) {
    await supabase.from('notifications').insert({
      user_id: notifyTarget,
      title: 'Citizen requests case update',
      body: `Citizen requests update on ${incident.fir_number || incident.id.slice(0, 8)}`,
      type: 'system',
      reference_id: incident.id,
    })
  }

  return {
    success: true,
    message: 'Update requested. Officer will respond within 48 hours.',
    requestId: newRequest?.id,
  }
}

// ── Action 3: Escalate report ────────────────────────────────────────
export async function escalateReport(
  _prevState: unknown,
  formData: FormData
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = {
    incidentId: formData.get('incidentId') as string,
    reason: formData.get('reason') as string,
    escalateTo: (formData.get('escalateTo') as string) || 'sho',
  }

  const parsed = escalateReportSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }
  const input = parsed.data

  // Verify ownership
  const { data: incident } = await supabase
    .from('incidents')
    .select('id, status, assigned_officer_id, fir_number, station_id')
    .eq('id', input.incidentId)
    .eq('reporter_id', user.id)
    .single()

  if (!incident) return { error: 'Incident not found' }
  if (['resolved', 'closed', 'rejected'].includes(incident.status)) {
    return { error: 'Cannot escalate a resolved, closed, or rejected case' }
  }

  // 7-day cooldown check
  const { data: lastEscalation } = await supabase
    .from('escalation_log')
    .select('created_at, escalated_at')
    .eq('incident_id', input.incidentId)
    .eq('citizen_initiated', true)
    .order('created_at', { ascending: false })
    .limit(1)

  if (lastEscalation && lastEscalation.length > 0) {
    const lastTime = new Date(lastEscalation[0].escalated_at || lastEscalation[0].created_at).getTime()
    const now = Date.now()
    if (now - lastTime < 7 * 24 * 60 * 60 * 1000) {
      const nextAvailable = new Date(lastTime + 7 * 24 * 60 * 60 * 1000)
      return {
        error: 'You can only escalate once every 7 days.',
        nextAvailableAt: nextAvailable.toISOString(),
      }
    }
  }

  // Insert escalation
  const { error: insertError } = await supabase
    .from('escalation_log')
    .insert({
      incident_id: input.incidentId,
      escalated_by: user.id,
      from_role: 'citizen',
      to_role: input.escalateTo,
      reason: input.reason,
      citizen_reason: input.reason,
      citizen_initiated: true,
      cooldown_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      escalated_at: new Date().toISOString(),
    })

  if (insertError) {
    return { error: 'Failed to escalate. Please try again.' }
  }

  // Insert case update (public — citizen sees it)
  await supabase.from('case_updates').insert({
    incident_id: input.incidentId,
    posted_by: user.id,
    content: 'Your complaint has been escalated to senior officer for review.',
    is_public: true,
    update_type: 'info',
  })

  return {
    success: true,
    message: `Case escalated to ${input.escalateTo.toUpperCase()}. Senior officer notified.`,
  }
}

// ── Action 4: Submit case feedback ───────────────────────────────────
export async function submitCaseFeedback(
  _prevState: unknown,
  formData: FormData
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const raw = {
    incidentId: formData.get('incidentId') as string,
    rating: formData.get('rating'),
    comment: (formData.get('comment') as string) || undefined,
    wasOfficerResponsive: formData.get('wasOfficerResponsive'),
    wasResolutionSatisfactory: formData.get('wasResolutionSatisfactory'),
  }

  const parsed = submitFeedbackSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }
  const input = parsed.data

  // Verify ownership and status
  const { data: incident } = await supabase
    .from('incidents')
    .select('status')
    .eq('id', input.incidentId)
    .eq('reporter_id', user.id)
    .single()

  if (!incident) return { error: 'Incident not found' }
  if (!['resolved', 'closed'].includes(incident.status)) {
    return { error: 'Feedback can only be submitted for resolved or closed cases' }
  }

  // Check for existing feedback
  const { data: existing } = await supabase
    .from('case_feedback')
    .select('id')
    .eq('incident_id', input.incidentId)
    .eq('citizen_id', user.id)
    .limit(1)

  if (existing && existing.length > 0) {
    return { error: 'You have already submitted feedback for this case' }
  }

  // Insert feedback
  const { error: insertError } = await supabase
    .from('case_feedback')
    .insert({
      incident_id: input.incidentId,
      citizen_id: user.id,
      rating: input.rating,
      comment: input.comment || null,
      was_officer_responsive: input.wasOfficerResponsive,
      was_resolution_satisfactory: input.wasResolutionSatisfactory,
    })

  if (insertError) {
    return { error: 'Failed to submit feedback. Please try again.' }
  }

  return {
    success: true,
    message: 'Thank you for your feedback.',
  }
}

// ── Action 5: Add evidence to case ───────────────────────────────────
export async function addEvidenceToCase(
  incidentId: string,
  storagePath: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  category: string,
  description?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership and status
  const { data: incident } = await supabase
    .from('incidents')
    .select('status, assigned_officer_id, fir_number')
    .eq('id', incidentId)
    .eq('reporter_id', user.id)
    .single()

  if (!incident) return { error: 'Incident not found' }
  if (['closed', 'rejected'].includes(incident.status)) {
    return { error: 'Cannot add evidence to a closed or rejected case' }
  }

  // Check file count limit
  const { count } = await supabase
    .from('incident_evidence')
    .select('id', { count: 'exact', head: true })
    .eq('incident_id', incidentId)

  if (count && count >= 20) {
    return { error: 'Maximum 20 files allowed per incident' }
  }

  // Insert evidence record
  const { data: evidence, error: insertError } = await supabase
    .from('incident_evidence')
    .insert({
      incident_id: incidentId,
      uploaded_by: user.id,
      storage_path: storagePath,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
      category,
    })
    .select('id')
    .single()

  if (insertError) {
    return { error: 'Failed to add evidence. Please try again.' }
  }

  // Notify assigned officer
  if (incident.assigned_officer_id) {
    await supabase.from('notifications').insert({
      user_id: incident.assigned_officer_id,
      title: 'New evidence added',
      body: `Citizen added evidence to ${incident.fir_number || incidentId.slice(0, 8)}: ${fileName}`,
      type: 'incident_update',
      reference_id: incidentId,
    })
  }

  return { success: true, evidenceId: evidence?.id }
}

// ── Action 6: Download FIR document ──────────────────────────────────
export async function downloadFIRDocument(incidentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership
  const { data: incident } = await supabase
    .from('incidents')
    .select('id, fir_number, reporter_id')
    .eq('id', incidentId)
    .eq('reporter_id', user.id)
    .single()

  if (!incident) return { error: 'Incident not found' }

  if (!incident.fir_number) {
    return { locked: true, reason: 'fir_not_assigned' }
  }

  // Get current FIR document
  const { data: doc } = await supabase
    .from('fir_documents')
    .select('*')
    .eq('incident_id', incidentId)
    .eq('is_current', true)
    .limit(1)
    .single()

  if (!doc) {
    return { generating: true }
  }

  // Generate signed URL (15 minutes)
  const { data: signedUrlData, error: urlError } = await supabase.storage
    .from('fir-documents')
    .createSignedUrl(doc.storage_path, 900) // 15 min

  if (urlError || !signedUrlData) {
    return { error: 'Failed to generate download link' }
  }

  // Log download in audit
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'download',
    entity_type: 'fir_documents',
    entity_id: doc.id,
    details: { incident_id: incidentId },
  })

  return {
    signedUrl: signedUrlData.signedUrl,
    fileName: `FIR_${incident.fir_number}_v${doc.version}.pdf`,
    fileSize: doc.file_size_bytes,
    generatedAt: doc.generated_at,
  }
}
