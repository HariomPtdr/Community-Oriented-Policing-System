'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, FileText, PenTool } from 'lucide-react'
import { FIRDetailShell } from '@/components/fir-tracking/FIRDetailShell'

export default function FIRDetailPage() {
  const params = useParams()
  const router = useRouter()
  const incidentId = params.incidentId as string
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Fetch incident
    const { data: incident, error: err } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', incidentId)
      .eq('reporter_id', user.id)
      .single()

    if (err || !incident) { setError('Report not found'); setLoading(false); return }
    if (incident.status === 'draft') {
      setData({ isDraft: true, incident })
      setLoading(false)
      return
    }

    // Parallel fetches
    const [officerRes, evidenceRes, historyRes, updatesRes, lastReqRes, lastEscRes, feedbackRes, theftRes, cyberRes, fraudRes, burgRes, ncrRes] = await Promise.all([
      incident.assigned_officer_id
        ? supabase.from('profiles').select('full_name, avatar_url').eq('id', incident.assigned_officer_id).single().then(async (p) => {
            if (!p.data) return null
            const { data: op } = await supabase.from('officer_profiles').select('badge_number, rank').eq('id', incident.assigned_officer_id).single()
            return op ? { full_name: p.data.full_name, avatar_url: p.data.avatar_url, badge_number: op.badge_number, rank: op.rank } : null
          })
        : Promise.resolve(null),
      supabase.from('incident_evidence').select('*').eq('incident_id', incidentId).order('uploaded_at', { ascending: true }).then(r => r.data || []),
      supabase.from('incident_status_history').select('*').eq('incident_id', incidentId).order('changed_at', { ascending: true }).then(async (r) => {
        const items = r.data || []
        for (const h of items) {
          if (h.changed_by) {
            const { data: p } = await supabase.from('profiles').select('full_name, role').eq('id', h.changed_by).single()
            if (p) { h.changed_by_name = p.full_name; h.changed_by_role = p.role }
          }
        }
        return items
      }),
      supabase.from('case_updates').select('*').eq('incident_id', incidentId).eq('is_public', true).order('created_at', { ascending: false }).then(async (r) => {
        const items = r.data || []
        for (const u of items) {
          if (u.posted_by) {
            const { data: p } = await supabase.from('profiles').select('full_name, role').eq('id', u.posted_by).single()
            if (p) { u.poster_name = p.full_name; u.poster_role = p.role }
          }
        }
        return items
      }),
      supabase.from('status_update_requests').select('*').eq('incident_id', incidentId).eq('requested_by', user.id).order('requested_at', { ascending: false }).limit(1).then(r => r.data?.[0] || null),
      supabase.from('escalation_log').select('*').eq('incident_id', incidentId).order('created_at', { ascending: false }).limit(1).then(r => r.data?.[0] || null),
      supabase.from('case_feedback').select('*').eq('incident_id', incidentId).eq('citizen_id', user.id).limit(1).then(r => r.data?.[0] || null),
      supabase.from('incident_simple_theft').select('*').eq('incident_id', incidentId).single().then(r => r.data),
      supabase.from('incident_cyber_crime').select('*').eq('incident_id', incidentId).single().then(r => r.data),
      supabase.from('incident_cheating_fraud').select('*').eq('incident_id', incidentId).single().then(r => r.data),
      supabase.from('incident_burglary').select('*').eq('incident_id', incidentId).single().then(r => r.data),
      supabase.from('incident_ncr').select('*').eq('incident_id', incidentId).single().then(r => r.data),
    ])

    // Signed URLs for evidence
    const evidenceWithUrls = await Promise.all(
      evidenceRes.map(async (ev: any) => {
        if (ev.storage_path) {
          try {
            const { data: urlData } = await supabase.storage.from(ev.bucket || 'incident-evidence').createSignedUrl(ev.storage_path, 3600)
            return { ...ev, signedUrl: urlData?.signedUrl || ev.public_url }
          } catch { return { ...ev, signedUrl: ev.public_url } }
        }
        return { ...ev, signedUrl: ev.public_url }
      })
    )

    const now = Date.now()
    const canRequestUpdate = !lastReqRes || (now - new Date(lastReqRes.requested_at).getTime()) > 48 * 3600000
    const canEscalate = !['resolved','closed','rejected'].includes(incident.status) && (!lastEscRes || (now - new Date(lastEscRes.escalated_at || lastEscRes.created_at).getTime()) > 7 * 86400000)

    setData({
      incident: { ...incident, simple_theft: theftRes, cyber_crime: cyberRes, cheating_fraud: fraudRes, burglary: burgRes, ncr: ncrRes },
      assignedOfficer: officerRes,
      firDocument: null,
      evidence: evidenceWithUrls,
      statusHistory: historyRes,
      caseUpdates: updatesRes,
      lastStatusRequest: lastReqRes,
      lastEscalation: lastEscRes,
      existingFeedback: feedbackRes,
      canRequestUpdate,
      canEscalate,
      canAddEvidence: !['closed','rejected'].includes(incident.status),
      canSubmitFeedback: ['resolved','closed'].includes(incident.status) && !feedbackRes,
    })
    setLoading(false)
  }, [incidentId, router])

  useEffect(() => { loadData() }, [loadData])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('fir_' + incidentId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incidents', filter: `id=eq.${incidentId}` }, () => { loadData() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'case_updates', filter: `incident_id=eq.${incidentId}` }, () => { loadData() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [incidentId, loadData])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  )

  if (error || !data) return (
    <div className="max-w-4xl mx-auto py-12 text-center">
      <p className="text-red-400 mb-4">{error || 'Report not found'}</p>
      <button onClick={() => router.push('/citizen/my-reports')} className="text-orange-400 hover:underline flex items-center gap-2 mx-auto">
        <ArrowLeft className="w-4 h-4" /> Back to My Reports
      </button>
    </div>
  )

  if (data?.isDraft) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="bg-[#111827] border border-[#1F2D42] rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-orange-500/10 border-2 border-orange-500/20 flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-orange-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Draft Report</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">This report hasn't been submitted yet. Since this is an incomplete draft, status tracking is not available until you finish filing it.</p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button onClick={() => router.push('/citizen/report')} className="bg-gradient-to-r from-orange-500 hover:from-orange-400 to-orange-400 hover:to-orange-300 text-black px-6 py-3 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all">
              <PenTool className="w-4 h-4" /> Start New Report
            </button>
            <button onClick={() => router.push('/citizen/my-reports')} className="bg-[#0D1420] border border-[#1F2D42] shadow-sm hover:border-[#2a3a52] text-white px-6 py-3 font-medium rounded-xl flex items-center justify-center gap-2 transition-all">
              <ArrowLeft className="w-4 h-4" /> Back to My Reports
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <FIRDetailShell data={data} onRefresh={loadData} />
}
