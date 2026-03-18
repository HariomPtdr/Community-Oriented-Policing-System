import { createClient } from '@/lib/supabase/client'

// Re-export all module APIs
export * from './complaints'
export * from './fir'
export * from './patrol'
export * from './transparency'
export * from './sos'
export * from './integrity'

// ── Dashboard Metrics ──────────────────────────────────────────

export const getLiveStationStats = async (stationId: string) => {
  const supabase = createClient()
  return supabase.rpc('get_sho_station_summary', { p_station_id: stationId })
}

// Fallback if RPC doesn't exist — query counts directly
export const getLiveStationStatsFallback = async (stationId: string) => {
  const supabase = createClient()

  const [complaints, firs, sos, violations, closedMonth, closurePending] = await Promise.all([
    supabase.from('complaints').select('id', { count: 'exact', head: true })
      .eq('station_id', stationId).eq('status', 'PENDING'),
    supabase.from('fir_records').select('id', { count: 'exact', head: true })
      .eq('station_id', stationId)
      .not('case_status', 'in', '("CASE_CLOSED","CHARGE_SHEET_FILED")'),
    supabase.from('sos_alerts').select('id', { count: 'exact', head: true })
      .eq('station_id', stationId)
      .not('status', 'in', '("RESOLVED","FALSE_ALARM","CANCELLED")'),
    supabase.from('integrity_violations').select('id', { count: 'exact', head: true })
      .eq('station_id', stationId).eq('sho_action', 'PENDING_REVIEW'),
    supabase.from('fir_records').select('id', { count: 'exact', head: true })
      .eq('station_id', stationId).eq('case_status', 'CASE_CLOSED')
      .gte('closed_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase.from('fir_records').select('id', { count: 'exact', head: true })
      .eq('station_id', stationId).eq('has_pending_closure', true),
  ])

  return {
    data: {
      pending_complaints: complaints.count || 0,
      active_firs: firs.count || 0,
      active_sos: sos.count || 0,
      integrity_flags: violations.count || 0,
      cases_closed_month: closedMonth.count || 0,
      closure_pending: closurePending.count || 0,
    }
  }
}

// ── Shared: Re-authentication for sensitive actions ──────────

export const reauthForSensitiveAction = async (password: string) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) throw new Error('No authenticated user')

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  })
  if (error) throw new Error('Password incorrect. Action blocked.')
  return true
}

// ── Activity Feed ──────────────────────────────────────────────

export const loadRecentActivity = async (stationId: string, limit = 20) => {
  const supabase = createClient()

  // Get recent events across modules
  const [complaints, firs, tasks, sos, violations] = await Promise.all([
    supabase.from('complaints')
      .select('id, reference_number, category, status, created_at')
      .eq('station_id', stationId)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase.from('fir_records')
      .select('id, fir_number, case_status, last_activity_at')
      .eq('station_id', stationId)
      .order('last_activity_at', { ascending: false })
      .limit(5),

    supabase.from('investigation_tasks')
      .select('id, task_type, status, updated_at, fir_id')
      .order('updated_at', { ascending: false })
      .limit(5),

    supabase.from('sos_alerts')
      .select('id, emergency_type, status, trigger_at')
      .eq('station_id', stationId)
      .order('trigger_at', { ascending: false })
      .limit(5),

    supabase.from('integrity_violations')
      .select('id, violation_type, severity, created_at')
      .eq('station_id', stationId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Merge and sort all events by timestamp
  const events: any[] = []

  complaints.data?.forEach(c => events.push({
    type: 'complaint', id: c.id,
    title: `New Complaint: ${c.category}`,
    ref: c.reference_number, time: c.created_at,
    isUrgent: false
  }))

  firs.data?.forEach(f => events.push({
    type: 'fir', id: f.id,
    title: `FIR ${f.fir_number} — ${f.case_status?.replace(/_/g, ' ')}`,
    time: f.last_activity_at, isUrgent: false
  }))

  sos.data?.forEach(s => events.push({
    type: 'sos', id: s.id,
    title: `SOS Alert: ${s.emergency_type} — ${s.status}`,
    time: s.trigger_at, isUrgent: true
  }))

  violations.data?.forEach(v => events.push({
    type: 'integrity', id: v.id,
    title: `Integrity: ${v.violation_type?.replace(/_/g, ' ')} — ${v.severity}`,
    time: v.created_at, isUrgent: v.severity === 'CRITICAL'
  }))

  events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  return events.slice(0, limit)
}

// ── Station Officers List ──────────────────────────────────────

export const loadStationOfficers = async (stationId: string) => {
  const supabase = createClient()
  return supabase.from('officer_profiles')
    .select(`
      id, full_name, rank, badge_number, specialization,
      duty_status, op_status, shift_status,
      current_lat, current_lon, last_gps_update,
      integrity_score, patrol_compliance,
      task_completion_rate, active_case_count,
      device_battery_pct
    `)
    .eq('station_id', stationId)
    .order('rank', { ascending: true })
}
