export type UserRole = 'citizen' | 'constable' | 'si' | 'sho' | 'dsp' | 'admin' | 'oversight'

export type IncidentStatus =
  | 'submitted' | 'under_review' | 'assigned'
  | 'in_progress' | 'resolved' | 'closed'

export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical'

export type IncidentCategory =
  | 'theft' | 'assault' | 'vandalism' | 'robbery' | 'burglary'
  | 'traffic' | 'noise_complaint' | 'suspicious_activity'
  | 'drug_activity' | 'domestic' | 'missing_person' | 'other'

export type AlertType =
  | 'crime_alert' | 'missing_person' | 'wanted_notice'
  | 'safety_advisory' | 'sos'

export type ComplaintStatus =
  | 'filed' | 'under_review' | 'investigating' | 'resolved' | 'dismissed'

export type Profile = {
  id: string
  role: UserRole
  full_name: string
  phone?: string
  avatar_url?: string
  preferred_language: string
  address?: string
  neighborhood_id?: string
  created_at: string
  updated_at: string
}

export type OfficerProfile = {
  id: string
  badge_number: string
  rank: string
  role: UserRole
  station_id?: string
  beat_id?: string
  supervisor_id?: string
  zone_id?: string
  is_verified: boolean
  is_active: boolean
  years_of_service: number
  languages: string[]
  community_rating: number
  total_ratings: number
  bio?: string
  created_at: string
  updated_at: string
}

export type Incident = {
  id: string
  title: string
  description: string
  category: IncidentCategory
  status: IncidentStatus
  priority: IncidentPriority
  is_anonymous: boolean
  reporter_id?: string
  assigned_officer_id?: string
  neighborhood_id?: string
  latitude?: number
  longitude?: number
  location_description?: string
  occurred_at?: string
  resolved_at?: string
  resolution_notes?: string
  escalated_to_id?: string
  escalation_level?: UserRole
  ai_category_confidence?: number
  created_at: string
  updated_at: string
}

export type Alert = {
  id: string
  type: AlertType
  title: string
  description: string
  neighborhood_id?: string
  radius_km: number
  latitude?: number
  longitude?: number
  created_by?: string
  image_url?: string
  is_active: boolean
  expires_at?: string
  created_at: string
}

export type Message = {
  id: string
  incident_id?: string
  sender_id: string
  recipient_id: string
  content: string
  is_read: boolean
  is_anonymous_sender: boolean
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  title: string
  body: string
  type: string
  reference_id?: string
  is_read: boolean
  created_at: string
}

export type Zone = {
  id: string
  name: string
  city: string
  state: string
  dsp_id?: string
  boundary?: unknown
  created_at: string
}

export type Station = {
  id: string
  name: string
  zone_id?: string
  sho_id?: string
  address?: string
  phone?: string
  latitude?: number
  longitude?: number
  created_at: string
}

export type Neighborhood = {
  id: string
  name: string
  city: string
  state: string
  station_id?: string
  assigned_constable_id?: string
  assigned_si_id?: string
  boundary?: unknown
  created_at: string
}

export type ForumPost = {
  id: string
  neighborhood_id: string
  author_id?: string
  title: string
  content: string
  is_pinned: boolean
  is_anonymous: boolean
  upvotes: number
  created_at: string
  updated_at: string
}

export type EscalationLog = {
  id: string
  incident_id: string
  escalated_by?: string
  escalated_to?: string
  from_role: UserRole
  to_role: UserRole
  reason?: string
  created_at: string
}

export type Directive = {
  id: string
  from_officer: string
  to_officer: string
  subject: string
  body: string
  incident_id?: string
  is_read: boolean
  created_at: string
}

// UI helper types
export const STATUS_VISUAL: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  submitted:    { label: 'Submitted',    bg: 'bg-gray-700',          text: 'text-gray-300',   dot: 'bg-gray-400' },
  under_review: { label: 'Under Review', bg: 'bg-blue-500/15',       text: 'text-blue-400',   dot: 'bg-blue-400' },
  assigned:     { label: 'Assigned',     bg: 'bg-indigo-500/15',     text: 'text-indigo-400', dot: 'bg-indigo-400' },
  in_progress:  { label: 'In Progress',  bg: 'bg-amber-500/15',      text: 'text-amber-400',  dot: 'bg-amber-400' },
  resolved:     { label: 'Resolved',     bg: 'bg-green-500/15',      text: 'text-green-400',  dot: 'bg-green-400' },
  closed:       { label: 'Closed',       bg: 'bg-slate-700',         text: 'text-slate-400',  dot: 'bg-slate-500' },
}

export const PRIORITY_VISUAL: Record<string, { label: string; color: string; bg: string; pulse: boolean }> = {
  low:      { label: 'Low',      color: 'text-green-400',  bg: 'bg-green-500/10',  pulse: false },
  medium:   { label: 'Medium',   color: 'text-amber-400',  bg: 'bg-amber-500/10',  pulse: false },
  high:     { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-500/10', pulse: false },
  critical: { label: 'Critical', color: 'text-red-400',    bg: 'bg-red-500/10',    pulse: true },
}

export const CATEGORY_ICONS: Record<string, string> = {
  theft:               '🔓',
  assault:             '⚠️',
  vandalism:           '🔨',
  robbery:             '💰',
  burglary:            '🏠',
  traffic:             '🚗',
  noise_complaint:     '🔊',
  suspicious_activity: '👁',
  drug_activity:       '💊',
  domestic:            '🏘',
  missing_person:      '🔍',
  other:               '📋',
}

export const RANK_CONFIG: Record<string, { label: string; color: string }> = {
  constable: { label: 'PC',        color: 'bg-gray-700 text-gray-300' },
  si:        { label: 'SI',        color: 'bg-blue-600 text-white' },
  sho:       { label: 'SHO ★',     color: 'bg-amber-500 text-black' },
  dsp:       { label: 'DSP 🛡',    color: 'bg-yellow-600 text-black' },
  admin:     { label: 'ADMIN',     color: 'bg-purple-600 text-white' },
  oversight: { label: 'OVERSIGHT', color: 'bg-teal-600 text-white' },
  citizen:   { label: 'CITIZEN',   color: 'bg-gray-800 text-gray-400' },
}

export const ROLE_HOME: Record<string, string> = {
  citizen:    '/citizen/dashboard',
  constable:  '/officer/constable/dashboard',
  si:         '/officer/si/dashboard',
  sho:        '/officer/sho/dashboard',
  dsp:        '/officer/dsp/dashboard',
  admin:      '/admin/dashboard',
  oversight:  '/oversight/dashboard',
}

export const ALERT_TYPE_VISUAL: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  crime_alert:     { label: 'Crime Alert',     color: 'text-red-400',    bg: 'bg-red-500/10',    icon: '🚨' },
  missing_person:  { label: 'Missing Person',  color: 'text-amber-400',  bg: 'bg-amber-500/10',  icon: '🔍' },
  wanted_notice:   { label: 'Wanted Notice',   color: 'text-orange-400', bg: 'bg-orange-500/10', icon: '⚠️' },
  safety_advisory: { label: 'Safety Advisory', color: 'text-blue-400',   bg: 'bg-blue-500/10',   icon: '🛡' },
  sos:             { label: 'SOS Emergency',   color: 'text-red-400',    bg: 'bg-red-500/20',    icon: '🆘' },
}
