import { createClient } from '@/lib/supabase/client'

// ── Module 5: SOS Command Center API ──────────────────────────

export const loadActiveSOSAlerts = async (stationId: string) => {
  const supabase = createClient()
  return supabase.from('sos_alerts')
    .select(`
      *,
      citizen_profiles!citizen_id(
        full_name, mobile, age, gender,
        has_disability, is_elderly, false_alarm_count
      ),
      officer_profiles!assigned_officer_id(
        full_name, rank, badge_number, current_lat, current_lon,
        last_gps_update, op_status
      )
    `)
    .eq('station_id', stationId)
    .not('status', 'in', '("RESOLVED","FALSE_ALARM","CANCELLED")')
    .order('priority_score', { ascending: false })
}

export const loadSOSHistory = async (stationId: string, limit = 50) => {
  const supabase = createClient()
  return supabase.from('sos_alerts')
    .select(`
      *,
      citizen_profiles!citizen_id(full_name, mobile),
      officer_profiles!assigned_officer_id(full_name, rank)
    `)
    .eq('station_id', stationId)
    .in('status', ['RESOLVED', 'FALSE_ALARM', 'CANCELLED'])
    .order('trigger_at', { ascending: false })
    .limit(limit)
}

export const manualAssignOfficer = async (sosId: string, officerId: string) => {
  const supabase = createClient()
  const { data: sos } = await supabase
    .from('sos_alerts')
    .select('trigger_lat, trigger_lon')
    .eq('id', sosId).single()

  const { data: officer } = await supabase
    .from('officer_profiles')
    .select('current_lat, current_lon')
    .eq('id', officerId).single()

  await supabase.from('sos_alerts').update({
    assigned_officer_id: officerId,
    status: 'DISPATCHED',
    dispatched_at: new Date().toISOString(),
    assignment_method: 'SHO_MANUAL',
  }).eq('id', sosId)

  await supabase.from('officer_profiles')
    .update({ op_status: 'EN_ROUTE' })
    .eq('id', officerId)

  // Trigger route calculation
  if (sos && officer) {
    await supabase.functions.invoke('calculate-sos-route', {
      body: {
        sos_id: sosId,
        officer_lat: officer.current_lat,
        officer_lon: officer.current_lon,
        citizen_lat: sos.trigger_lat,
        citizen_lon: sos.trigger_lon,
      }
    }).catch(() => {})
  }

  return { success: true }
}

export const assignBackupOfficer = async (sosId: string, backupOfficerId: string) => {
  const supabase = createClient()
  return supabase.from('sos_alerts')
    .update({ backup_officer_id: backupOfficerId })
    .eq('id', sosId)
}

export const markFalseAlarm = async (sosId: string, reason: string, shoId: string) => {
  const supabase = createClient()
  return supabase.from('sos_alerts').update({
    status: 'FALSE_ALARM',
    false_alarm_reason: reason,
    false_alarm_confirmed_by: shoId,
    resolved_at: new Date().toISOString(),
  }).eq('id', sosId)
}

export const resolveSOSAlert = async (sosId: string, notes: string) => {
  const supabase = createClient()
  return supabase.from('sos_alerts').update({
    status: 'RESOLVED',
    resolution_notes: notes,
    resolved_at: new Date().toISOString(),
  }).eq('id', sosId)
}

export const escalateSOSAlert = async (sosId: string) => {
  const supabase = createClient()
  return supabase.from('sos_alerts')
    .update({ status: 'ESCALATED' })
    .eq('id', sosId)
}

export const loadWatchdogLog = async (stationId: string, limit = 50) => {
  const supabase = createClient()
  return supabase.from('sos_watchdog_log')
    .select(`
      *,
      sos_alerts!sos_id(
        emergency_type, priority_score, trigger_at,
        citizen_profiles!citizen_id(full_name)
      )
    `)
    .eq('station_id', stationId)
    .order('created_at', { ascending: false })
    .limit(limit)
}

export const loadSOSTimeline = async (sosId: string) => {
  const supabase = createClient()
  return supabase.from('sos_timeline')
    .select('*')
    .eq('sos_id', sosId)
    .order('occurred_at', { ascending: true })
}

export const requestMutualAid = async (data: {
  sosId: string
  requestingStation: string
  respondingStation: string
  requestedBy: string
  reason: string
}) => {
  const supabase = createClient()
  return supabase.from('mutual_aid_requests').insert({
    sos_id: data.sosId,
    requesting_station: data.requestingStation,
    responding_station: data.respondingStation,
    requested_by: data.requestedBy,
    reason: data.reason,
  }).select().single()
}

export const getSOSStats = async (stationId: string) => {
  const supabase = createClient()
  const { data } = await supabase
    .from('sos_alerts')
    .select('id, status, priority_score, time_to_arrival_sec, trigger_at')
    .eq('station_id', stationId)
    .gte('trigger_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  if (!data) return { total: 0, active: 0, resolved: 0, falseAlarms: 0, avgResponseMin: 0 }

  const resolved = data.filter(s => s.status === 'RESOLVED')
  const avgResponse = resolved.length > 0
    ? resolved.reduce((sum, s) => sum + (s.time_to_arrival_sec || 0), 0) / resolved.length / 60
    : 0

  return {
    total: data.length,
    active: data.filter(s => !['RESOLVED', 'FALSE_ALARM', 'CANCELLED'].includes(s.status)).length,
    resolved: resolved.length,
    falseAlarms: data.filter(s => s.status === 'FALSE_ALARM').length,
    avgResponseMin: Math.round(avgResponse * 10) / 10,
  }
}

// Get available officers for SOS dispatch (sorted by proximity)
export const getAvailableOfficers = async (stationId: string, lat: number, lon: number) => {
  const supabase = createClient()
  const { data: officers } = await supabase
    .from('officer_profiles')
    .select('id, full_name, rank, badge_number, current_lat, current_lon, op_status, last_gps_update, device_battery_pct')
    .eq('station_id', stationId)
    .eq('duty_status', 'ACTIVE')
    .in('op_status', ['AVAILABLE', 'BUSY'])
    .not('current_lat', 'is', null)

  if (!officers) return { data: [] }

  // Calculate distance and sort
  const withDistance = officers.map(o => {
    const dLat = (o.current_lat! - lat) * 111320
    const dLon = (o.current_lon! - lon) * 111320 * Math.cos(lat * Math.PI / 180)
    const distance = Math.sqrt(dLat * dLat + dLon * dLon)
    return { ...o, distance_m: Math.round(distance) }
  }).sort((a, b) => a.distance_m - b.distance_m)

  return { data: withDistance }
}
