import { createClient } from '@/lib/supabase/client'

// ── Module 3: Patrol Oversight API ──────────────────────────

export const loadCurrentShift = async (stationId: string) => {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const hour = new Date().getHours()
  const shiftType = hour < 14 ? 'MORNING' : hour < 22 ? 'AFTERNOON' : 'NIGHT'

  return supabase
    .from('patrol_shifts')
    .select(`
      *,
      patrol_assignments(
        *,
        officer_profiles!officer_id(
          full_name, rank, badge_number, current_lat, current_lon,
          last_gps_update, op_status, gps_accuracy_m, device_battery_pct
        ),
        patrol_zones!zone_id(zone_name, classification, is_sensitive, boundary_polygon)
      )
    `)
    .eq('station_id', stationId)
    .eq('shift_date', today)
    .eq('shift_type', shiftType)
    .single()
}

export const loadAllShifts = async (stationId: string, date?: string) => {
  const supabase = createClient()
  const targetDate = date || new Date().toISOString().split('T')[0]

  return supabase
    .from('patrol_shifts')
    .select(`
      *,
      patrol_assignments(
        *,
        officer_profiles!officer_id(full_name, rank, badge_number, op_status),
        patrol_zones!zone_id(zone_name, classification, is_sensitive)
      )
    `)
    .eq('station_id', stationId)
    .eq('shift_date', targetDate)
    .order('start_time', { ascending: true })
}

export const getOfficerGPSTrail = async (officerId: string, startTime: string) => {
  const supabase = createClient()
  return supabase.from('officer_gps_trail')
    .select('lat, lon, accuracy_m, recorded_at, activity_type, speed_mps')
    .eq('officer_id', officerId)
    .gte('recorded_at', startTime)
    .order('recorded_at', { ascending: true })
}

export const getPatrolZones = async (stationId: string) => {
  const supabase = createClient()
  return supabase.from('patrol_zones')
    .select('*')
    .eq('station_id', stationId)
    .eq('is_active', true)
}

export const createPatrolShift = async (shiftData: any, assignments: any[]) => {
  const supabase = createClient()
  const { data: shift, error } = await supabase
    .from('patrol_shifts')
    .insert(shiftData)
    .select()
    .single()

  if (shift && !error) {
    await supabase.from('patrol_assignments')
      .insert(assignments.map(a => ({ ...a, shift_id: shift.id })))
  }
  return { data: shift, error }
}

export const loadPatrolReports = async (stationId: string, shiftId?: string) => {
  const supabase = createClient()
  let q = supabase.from('patrol_reports')
    .select(`
      *,
      officer_profiles!officer_id(full_name, rank, badge_number),
      patrol_zones!zone_id(zone_name, classification)
    `)
    .order('submitted_at', { ascending: false })

  if (shiftId) q = q.eq('shift_id', shiftId)
  return q
}

export const loadPatrolAnomalies = async (stationId: string) => {
  const supabase = createClient()
  return supabase.from('patrol_anomalies')
    .select(`
      *,
      officer_profiles!officer_id(full_name, rank, badge_number)
    `)
    .order('created_at', { ascending: false })
    .limit(50)
}

export const loadCoverageAnalytics = async (stationId: string, shiftId: string) => {
  const supabase = createClient()
  return supabase.from('patrol_coverage_log')
    .select(`
      *,
      officer_profiles!officer_id(full_name, rank),
      patrol_zones!zone_id(zone_name, classification, is_sensitive, min_patrol_minutes)
    `)
    .eq('shift_id', shiftId)
}

export const loadStationOfficersLocations = async (stationId: string) => {
  const supabase = createClient()
  return supabase.from('officer_profiles')
    .select(`
      id, full_name, rank, badge_number, current_lat, current_lon,
      last_gps_update, op_status, duty_status, gps_accuracy_m,
      device_battery_pct, shift_status
    `)
    .eq('station_id', stationId)
    .eq('duty_status', 'ACTIVE')
    .not('current_lat', 'is', null)
}

export const acknowledgePatrolReport = async (reportId: string, reviewerId: string, comment?: string) => {
  const supabase = createClient()
  return supabase.from('patrol_reports').update({
    reviewed_by: reviewerId,
    review_acknowledged: true,
    review_acknowledged_at: new Date().toISOString(),
    reviewer_comment: comment || null,
  }).eq('id', reportId)
}
