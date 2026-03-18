import { createClient } from '@/lib/supabase/client'

// ── Module 4: Transparency Reports API ──────────────────────────

export const loadTransparencyReports = async (stationId: string, status?: string) => {
  const supabase = createClient()
  let q = supabase.from('transparency_reports')
    .select('*')
    .eq('station_id', stationId)
    .order('created_at', { ascending: false })

  if (status) q = q.eq('status', status)
  return q
}

export const createReport = async (data: any) => {
  const supabase = createClient()
  return supabase.from('transparency_reports').insert(data).select().single()
}

export const updateReport = async (reportId: string, data: any) => {
  const supabase = createClient()
  return supabase.from('transparency_reports')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', reportId)
}

export const publishReport = async (reportId: string, statsSnapshot: any) => {
  const supabase = createClient()
  return supabase.from('transparency_reports').update({
    status: 'PUBLISHED',
    published_at: new Date().toISOString(),
    stats_snapshot: statsSnapshot,
  }).eq('id', reportId)
}

export const retractReport = async (reportId: string, userId: string, reason: string) => {
  const supabase = createClient()
  return supabase.from('transparency_reports').update({
    status: 'RETRACTED',
    retracted_by: userId,
    retracted_at: new Date().toISOString(),
    retraction_reason: reason,
  }).eq('id', reportId)
}

export const loadCarouselAnnouncements = async (stationId: string) => {
  const supabase = createClient()
  return supabase.from('carousel_announcements')
    .select('*')
    .eq('station_id', stationId)
    .order('display_order', { ascending: true })
}

export const createCarouselAnnouncement = async (data: any) => {
  const supabase = createClient()
  return supabase.from('carousel_announcements').insert(data).select().single()
}

export const deactivateCarousel = async (announcementId: string) => {
  const supabase = createClient()
  return supabase.from('carousel_announcements')
    .update({ is_active: false })
    .eq('id', announcementId)
}

export const loadReportFeedback = async (reportId: string) => {
  const supabase = createClient()
  return supabase.from('report_feedback')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: false })
}

export const getReportStats = async (stationId: string) => {
  const supabase = createClient()
  const { data } = await supabase
    .from('transparency_reports')
    .select('id, status, view_count, feedback_count, citizen_reach')
    .eq('station_id', stationId)

  if (!data) return { total: 0, published: 0, drafts: 0, totalViews: 0, totalFeedback: 0 }

  return {
    total: data.length,
    published: data.filter(r => r.status === 'PUBLISHED').length,
    drafts: data.filter(r => r.status === 'DRAFT').length,
    totalViews: data.reduce((sum, r) => sum + (r.view_count || 0), 0),
    totalFeedback: data.reduce((sum, r) => sum + (r.feedback_count || 0), 0),
  }
}
