'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type CurrentUser = {
  id: string
  email: string
  role: string
  fullName: string
  avatarUrl?: string
  badgeNumber?: string
  stationId?: string
  beatId?: string
  zoneId?: string
  isVerified?: boolean
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          role, full_name, avatar_url,
          officer_profiles (
            badge_number, station_id, beat_id,
            zone_id, is_verified, is_active
          )
        `)
        .eq('id', authUser.id)
        .single()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const officer = (profile as any)?.officer_profiles

      setUser({
        id: authUser.id,
        email: authUser.email!,
        role: profile?.role ?? 'citizen',
        fullName: profile?.full_name ?? '',
        avatarUrl: profile?.avatar_url,
        badgeNumber: officer?.badge_number,
        stationId: officer?.station_id,
        beatId: officer?.beat_id,
        zoneId: officer?.zone_id,
        isVerified: officer?.is_verified,
      })
      setLoading(false)
    }

    fetchUser()
  }, [])

  return { user, loading }
}
