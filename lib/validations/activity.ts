import { z } from 'zod'

export const activityFilterSchema = z.enum([
  'all', 'reports', 'sos', 'forum', 'account', 'alerts'
])

export const activityPageSchema = z.object({
  filter: activityFilterSchema.default('all'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
})

export type ActivityFilter = z.infer<typeof activityFilterSchema>
export type ActivityPageParams = z.infer<typeof activityPageSchema>

export interface ActivityEvent {
  id: string
  createdAt: string
  eventType: string
  title: string
  subtitle: string | null
  actionLabel: string | null
  actionUrl: string | null
  metadata: Record<string, unknown>
  category: 'reports' | 'sos' | 'forum' | 'account' | 'alerts'
}

export interface ActivityStats {
  totalReports: number
  activeReports: number
  resolvedReports: number
  resolutionRatePct: number
  forumPosts: number
  sosEvents: number
  memberSinceDays: number
}

export interface MonthlySummary {
  monthLabel: string
  reportsFiled: number
  reportsResolved: number
  reportsActive: number
  sosActivated: number
  forumPosts: number
  alertsReceived: number
  memberSinceDays: number
}
