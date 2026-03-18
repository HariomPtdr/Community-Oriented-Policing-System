import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, userId, latitude, longitude, accuracy, locationSource, locationDescription, isPractice, emergencyContacts, deviceInfo } = body

    if (action === 'activate') {
      // Check for existing active SOS (non-practice only)
      if (!isPractice) {
        const { data: existing } = await supabaseAdmin
          .from('sos_events')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .eq('is_practice', false)
          .maybeSingle()

        if (existing) {
          return NextResponse.json({ id: existing.id, existing: true })
        }
      }

      // Create SOS event
      const { data: sos, error } = await supabaseAdmin
        .from('sos_events')
        .insert({
          user_id: userId,
          latitude,
          longitude,
          location_accuracy: accuracy,
          location_source: locationSource || 'gps',
          location_description: locationDescription,
          location_history: [{ latitude, longitude, accuracy, source: locationSource, timestamp: new Date().toISOString() }],
          status: isPractice ? 'resolved' : 'active',
          is_practice: isPractice || false,
          emergency_contacts: emergencyContacts || [],
          device_info: deviceInfo || {},
          // Auto-resolve practice drills
          ...(isPractice ? { resolved_at: new Date().toISOString() } : {}),
        })
        .select('id')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Find and notify nearby officers (non-practice only)
      if (!isPractice) {
        // 1. Get user's neighborhood
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('neighborhood_id, full_name, phone')
          .eq('id', userId)
          .single()

        // 2. Find on-duty officers in the neighborhood
        const { data: officers } = await supabaseAdmin
          .from('officer_duty_status')
          .select('officer_id')
          .eq('is_on_duty', true)
          .limit(5)

        // 3. Send notifications to officers
        if (officers && officers.length > 0) {
          const mapsLink = latitude && longitude && latitude !== 0
            ? `https://maps.google.com/?q=${latitude},${longitude}`
            : 'Location pending'

          const notifications = officers.map((o: any) => ({
            user_id: o.officer_id,
            title: '🚨 SOS ALERT — Citizen in Danger',
            body: `Emergency SOS from ${profile?.full_name || 'Citizen'}. Location: ${mapsLink}`,
            type: 'sos',
            data: { sos_id: sos.id, latitude, longitude, maps_link: mapsLink },
          }))

          await supabaseAdmin.from('notifications').insert(notifications)
        }

        // 4. If no officers found, auto-escalate
        if (!officers || officers.length === 0) {
          await supabaseAdmin.from('sos_events').update({
            escalation_level: 'si',
            escalated_at: new Date().toISOString(),
          }).eq('id', sos.id)

          // Notify all officers regardless
          const { data: allOfficers } = await supabaseAdmin
            .from('officer_profiles')
            .select('id')
            .eq('is_verified', true)
            .limit(10)

          if (allOfficers) {
            const urgentNotifs = allOfficers.map((o: any) => ({
              user_id: o.id,
              title: '🚨🚨 ESCALATED SOS — No Beat Officers Available',
              body: `URGENT: Citizen SOS with no responding officers. Auto-escalated.`,
              type: 'sos',
              data: { sos_id: sos.id, latitude, longitude, escalated: true },
            }))

            await supabaseAdmin.from('notifications').insert(urgentNotifs)
          }
        }

        // 5. Log to audit
        await supabaseAdmin.from('audit_log').insert({
          actor_id: userId,
          action: 'sos_activated',
          entity_type: 'sos_event',
          entity_id: sos.id,
          details: { latitude, longitude, location_source: locationSource },
        })
      }

      return NextResponse.json({ id: sos.id, existing: false })
    }

    if (action === 'update_location') {
      const { sosId } = body
      
      // Append to location history
      const { data: current } = await supabaseAdmin
        .from('sos_events')
        .select('location_history')
        .eq('id', sosId)
        .single()

      const history = Array.isArray(current?.location_history) ? current.location_history : []
      history.push({ latitude, longitude, accuracy, source: locationSource, timestamp: new Date().toISOString() })

      await supabaseAdmin.from('sos_events').update({
        latitude,
        longitude,
        location_accuracy: accuracy,
        location_source: locationSource,
        location_history: history,
      }).eq('id', sosId)

      return NextResponse.json({ ok: true })
    }

    if (action === 'mark_sms_sent') {
      const { sosId, sentTo } = body

      await supabaseAdmin.from('sos_events').update({
        sms_sent_to: sentTo || [],
        emergency_contacts_notified: true,
      }).eq('id', sosId)

      return NextResponse.json({ ok: true })
    }

    if (action === 'cancel') {
      const { sosId } = body

      await supabaseAdmin.from('sos_events').update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      }).eq('id', sosId)

      // Log
      await supabaseAdmin.from('audit_log').insert({
        actor_id: userId,
        action: 'sos_cancelled',
        entity_type: 'sos_event',
        entity_id: sosId,
      })

      return NextResponse.json({ ok: true })
    }

    if (action === 'resolve') {
      const { sosId } = body

      await supabaseAdmin.from('sos_events').update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      }).eq('id', sosId)

      await supabaseAdmin.from('audit_log').insert({
        actor_id: userId,
        action: 'sos_resolved',
        entity_type: 'sos_event',
        entity_id: sosId,
      })

      return NextResponse.json({ ok: true })
    }

    if (action === 'get_active') {
      const { data } = await supabaseAdmin
        .from('sos_events')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('is_practice', false)
        .maybeSingle()

      return NextResponse.json({ sos: data })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
