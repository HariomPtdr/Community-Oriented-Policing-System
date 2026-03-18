import { createClient } from '@/lib/supabase/client'

// ── Module 6: Integrity System API ──────────────────────────

export const loadIntegrityViolations = async (stationId: string, action?: string) => {
  const supabase = createClient()
  let q = supabase.from('integrity_violations')
    .select(`
      *,
      officer_profiles!officer_id(full_name, rank, badge_number),
      investigation_tasks!task_id(task_type, description, location_name),
      location_verifications!verification_id(
        distance_meters, proximity_threshold_m, time_spent_seconds,
        min_time_required_sec, trail_point_count, failure_layers,
        trail_snapshot, officer_lat, officer_lon, required_lat, required_lon
      )
    `)
    .eq('station_id', stationId)
    .order('created_at', { ascending: false })

  if (action) q = q.eq('sho_action', action)
  return q
}

export const actOnViolation = async (
  violationId: string,
  action: string,
  note: string,
  shoId: string
) => {
  const supabase = createClient()
  return supabase.from('integrity_violations').update({
    sho_action: action,
    sho_action_by: shoId,
    sho_action_note: note,
    sho_action_at: new Date().toISOString(),
  }).eq('id', violationId)
}

export const escalateToSuperintendent = async (violationId: string) => {
  const supabase = createClient()
  return supabase.from('integrity_violations').update({
    escalated_to_superintendent: true,
    escalated_at: new Date().toISOString(),
  }).eq('id', violationId)
}

export const loadOfficerPerformance = async (stationId: string, month?: string) => {
  const supabase = createClient()
  const targetMonth = month || new Date().toISOString().slice(0, 7) + '-01'

  return supabase.from('officer_performance_metrics')
    .select(`
      *,
      officer_profiles!officer_id(full_name, rank, badge_number, specialization)
    `)
    .eq('station_id', stationId)
    .eq('metric_month', targetMonth)
    .order('performance_score', { ascending: false })
}

export const loadOfficerDetail = async (officerId: string) => {
  const supabase = createClient()
  return Promise.all([
    supabase.from('officer_profiles')
      .select('*')
      .eq('id', officerId)
      .single(),
    supabase.from('integrity_violations')
      .select('*')
      .eq('officer_id', officerId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('officer_performance_metrics')
      .select('*')
      .eq('officer_id', officerId)
      .order('metric_month', { ascending: false })
      .limit(6),
  ])
}

export const getIntegrityStats = async (stationId: string) => {
  const supabase = createClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('integrity_violations')
    .select('id, violation_type, severity, sho_action, created_at')
    .eq('station_id', stationId)
    .gte('created_at', thirtyDaysAgo)

  if (!data) return { total: 0, pending: 0, critical: 0, overridden: 0, flagged: 0, dismissed: 0 }

  return {
    total: data.length,
    pending: data.filter(v => v.sho_action === 'PENDING_REVIEW').length,
    critical: data.filter(v => v.severity === 'CRITICAL').length,
    overridden: data.filter(v => v.sho_action === 'OVERRIDE_ACCEPTABLE').length,
    flagged: data.filter(v => v.sho_action === 'FLAGGED_FOR_REVIEW').length,
    dismissed: data.filter(v => v.sho_action === 'DISMISSED_FALSE_POSITIVE').length,
  }
}
