import { createClient } from '@/lib/supabase/client'

// ── Module 1: Complaints Queue API ──────────────────────────

// Load FIFO queue with citizen data
export const loadComplaintsQueue = async (stationId: string, filters: any = {}) => {
  const supabase = createClient()
  // Try CODPP schema first, fall back to incidents table
  let q = supabase
    .from('complaints')
    .select(`
      id, reference_number, complainant_name, category,
      incident_location, incident_date, status,
      priority_flags, urgency_flag, jurisdiction_source,
      suggested_sections, evidence_count, created_at,
      sho_first_opened_at, sho_opened_count,
      description, mobile_primary, email, gender,
      filing_for, behalf_name, behalf_relation,
      father_name, mother_name, address, district,
      state, pincode, incident_lat, incident_lon,
      incident_time, incident_time_period, extra_fields,
      evidence_paths, forwarded_to, forwarded_reason,
      rejected_reason, rejected_explanation,
      citizen_profiles!citizen_id(
        full_name, mobile, age, gender,
        has_disability, is_elderly, false_alarm_count
      )
    `)
    .eq('station_id', stationId)
    .in('status', ['PENDING', 'OPENED', 'AWAITING_INFO'])
    .order('created_at', { ascending: true }) // FIFO

  if (filters.category) q = q.eq('category', filters.category)
  if (filters.urgency) q = q.eq('urgency_flag', filters.urgency)
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.search) {
    q = q.or(
      `complainant_name.ilike.%${filters.search}%,` +
      `mobile_primary.ilike.%${filters.search}%,` +
      `reference_number.ilike.%${filters.search}%`
    )
  }
  return q
}

// Load complaint by ID with full details
export const loadComplaintDetail = async (complaintId: string) => {
  const supabase = createClient()
  return supabase
    .from('complaints')
    .select(`
      *,
      citizen_profiles!citizen_id(
        full_name, mobile, age, gender,
        has_disability, is_elderly, false_alarm_count,
        address, city, state
      )
    `)
    .eq('id', complaintId)
    .single()
}

// Mark complaint as opened + record timestamp
export const openComplaint = async (complaintId: string) => {
  const supabase = createClient()
  return supabase.from('complaints').update({
    status: 'OPENED',
    sho_first_opened_at: new Date().toISOString(),
  }).eq('id', complaintId)
}

// Get officer assignment suggestions (workload balancing)
export const getOfficerSuggestions = async (stationId: string, category: string | null = null) => {
  const supabase = createClient()
  return supabase.rpc('get_si_assignment_suggestions', {
    p_station_id: stationId, p_category: category
  })
}

// Get all station officers for assignment
export const getStationOfficers = async (stationId: string) => {
  const supabase = createClient()
  const { data: officers } = await supabase
    .from('officer_profiles')
    .select(`
      id, full_name, rank, badge_number, specialization,
      duty_status, active_case_count, integrity_score,
      patrol_compliance, task_completion_rate
    `)
    .eq('station_id', stationId)
    .in('rank', ['SI', 'ASI'])
    .eq('duty_status', 'ACTIVE')
    .order('active_case_count', { ascending: true })

  return { data: officers }
}

// Register FIR from complaint
export const registerFIR = async ({
  complaintId, stationId, ioId, shoId, legalSections
}: {
  complaintId: string
  stationId: string
  ioId: string
  shoId: string
  legalSections: string[]
}) => {
  const supabase = createClient()
  const { data: firNumber } = await supabase
    .rpc('generate_fir_number', { p_station_id: stationId })

  const { data: fir, error } = await supabase
    .from('fir_records')
    .insert({
      fir_number: firNumber,
      complaint_id: complaintId,
      station_id: stationId,
      io_id: ioId,
      registered_by_sho: shoId,
      legal_sections: legalSections,
      case_status: 'FIR_REGISTERED'
    })
    .select()
    .single()

  if (!error && fir) {
    // Update complaint status
    await supabase.from('complaints')
      .update({ status: 'CONVERTED' })
      .eq('id', complaintId)

    // Invoke edge function for notification
    await supabase.functions.invoke('send-fir-registered', {
      body: { fir_id: fir.id, fir_number: firNumber }
    }).catch(() => {}) // silent fail
  }
  return { data: fir, error }
}

// Reject complaint — 100-char minimum explanation enforced
export const rejectComplaint = async (
  complaintId: string,
  reason: string,
  explanation: string
) => {
  if (explanation.length < 100) {
    return { data: null, error: { message: 'Explanation must be at least 100 characters' } }
  }
  const supabase = createClient()
  return supabase.from('complaints')
    .update({
      status: 'REJECTED',
      rejected_reason: reason,
      rejected_explanation: explanation
    })
    .eq('id', complaintId)
}

// Forward complaint to another station
export const forwardComplaint = async (
  complaintId: string,
  toStationId: string,
  reason: string
) => {
  const supabase = createClient()
  return supabase.from('complaints')
    .update({
      status: 'FORWARDED',
      forwarded_to: toStationId,
      forwarded_reason: reason
    })
    .eq('id', complaintId)
}

// Request additional info from citizen
export const requestAdditionalInfo = async (
  complaintId: string,
  shoId: string,
  message: string,
  template?: string
) => {
  const supabase = createClient()
  await supabase.from('complaint_info_requests').insert({
    complaint_id: complaintId,
    requested_by: shoId,
    message_text: message,
    template_used: template || null,
  })
  return supabase.from('complaints')
    .update({ status: 'AWAITING_INFO' })
    .eq('id', complaintId)
}

// Log call to complainant
export const logComplaintCall = async (
  complaintId: string,
  calledBy: string,
  calledNumber: string,
  summary: string
) => {
  const supabase = createClient()
  return supabase.from('complaint_call_logs').insert({
    complaint_id: complaintId,
    called_by: calledBy,
    called_number: calledNumber,
    call_summary: summary
  })
}

// Get complaint summary stats
export const getComplaintStats = async (stationId: string) => {
  const supabase = createClient()
  const { data } = await supabase
    .from('complaints')
    .select('id, status, urgency_flag, created_at')
    .eq('station_id', stationId)
    .in('status', ['PENDING', 'OPENED', 'AWAITING_INFO'])

  if (!data) return { total: 0, pending: 0, newToday: 0, overdue48h: 0, urgent: 0 }

  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  return {
    total: data.length,
    pending: data.filter(c => c.status === 'PENDING').length,
    newToday: data.filter(c => new Date(c.created_at) >= todayStart).length,
    overdue48h: data.filter(c => now - new Date(c.created_at).getTime() > 2 * dayMs).length,
    urgent: data.filter(c => c.urgency_flag).length,
  }
}
