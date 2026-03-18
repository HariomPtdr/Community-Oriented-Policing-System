import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type SHORealtimeCallbacks = {
  onNewComplaint?: (data: any) => void
  onComplaintUpdate?: (data: any) => void
  onFIRUpdate?: (newData: any, oldData?: any) => void
  onClosureRequest?: (data: any) => void
  onCitizenConcern?: (data: any) => void
  onOfficerGPS?: (data: any) => void
  onPatrolAnomaly?: (data: any) => void
  onCarouselChange?: (data: any) => void
  onSOSUpdate?: (newData: any, oldData?: any, eventType?: string) => void
  onWatchdogEvent?: (data: any) => void
  onIntegrityViolation?: (data: any) => void
  onNotification?: (data: any) => void
  onTaskUpdate?: (data: any) => void
}

export function useSHORealtime(
  stationId: string | undefined,
  userId: string | undefined,
  callbacks: SHORealtimeCallbacks = {}
) {
  const channels = useRef<any[]>([])
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  useEffect(() => {
    if (!stationId || !userId) return

    const supabase = createClient()

    // ── Module 1: New complaints in queue
    const c1 = supabase.channel('sho_complaints')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'complaints',
        filter: `station_id=eq.${stationId}`
      }, p => callbacksRef.current.onNewComplaint?.(p.new))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'complaints',
        filter: `station_id=eq.${stationId}`
      }, p => callbacksRef.current.onComplaintUpdate?.(p.new))
      .subscribe()

    // ── Module 2: FIR status updates
    const c2 = supabase.channel('sho_firs')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'fir_records',
        filter: `station_id=eq.${stationId}`
      }, p => callbacksRef.current.onFIRUpdate?.(p.new, p.old))
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'fir_records',
        filter: `station_id=eq.${stationId}`
      }, p => callbacksRef.current.onFIRUpdate?.(p.new))
      .subscribe()

    // ── Module 2: Closure requests
    const c3 = supabase.channel('sho_closures')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'closure_requests',
      }, p => callbacksRef.current.onClosureRequest?.(p.new))
      .subscribe()

    // ── Module 2: Citizen concerns
    const c4 = supabase.channel('sho_concerns')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'citizen_concerns',
      }, p => callbacksRef.current.onCitizenConcern?.(p.new))
      .subscribe()

    // ── Module 3: Officer GPS updates (patrol map)
    const c5 = supabase.channel('sho_officer_gps')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'officer_profiles',
      }, p => {
        if (p.new.station_id === stationId) {
          callbacksRef.current.onOfficerGPS?.(p.new)
        }
      })
      .subscribe()

    // ── Module 3: Patrol anomalies
    const c6 = supabase.channel('sho_patrol_anomalies')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'patrol_anomalies',
      }, p => callbacksRef.current.onPatrolAnomaly?.(p.new))
      .subscribe()

    // ── Module 4: Carousel announcements
    const c7 = supabase.channel('sho_carousel')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'carousel_announcements',
        filter: `station_id=eq.${stationId}`
      }, p => callbacksRef.current.onCarouselChange?.(p))
      .subscribe()

    // ── Module 5: ALL SOS alert changes — most critical
    const c8 = supabase.channel('sho_sos')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'sos_alerts',
        filter: `station_id=eq.${stationId}`
      }, p => callbacksRef.current.onSOSUpdate?.(p.new, p.old, p.eventType))
      .subscribe()

    // ── Module 5: SOS watchdog events
    const c9 = supabase.channel('sho_watchdog')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'sos_watchdog_log',
      }, p => {
        if (p.new.station_id === stationId) {
          callbacksRef.current.onWatchdogEvent?.(p.new)
        }
      })
      .subscribe()

    // ── Module 6: Integrity violations
    const c10 = supabase.channel('sho_integrity')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'integrity_violations',
      }, p => {
        if (p.new.station_id === stationId) {
          callbacksRef.current.onIntegrityViolation?.(p.new)
        }
      })
      .subscribe()

    // ── All: Notification bell
    const c11 = supabase.channel(`sho_notifs_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, p => callbacksRef.current.onNotification?.(p.new))
      .subscribe()

    channels.current = [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11]

    return () => {
      channels.current.forEach(c => supabase.removeChannel(c))
    }
  }, [stationId, userId])
}
