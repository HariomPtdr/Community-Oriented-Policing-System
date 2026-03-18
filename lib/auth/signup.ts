import { createClient } from '@/lib/supabase/client'

export type SignupData = {
  email: string
  password: string
  fullName: string
  phone?: string
  role: 'citizen' | 'constable' | 'si' | 'sho' | 'dsp'
  badgeNumber?: string
  stationId?: string
  zoneId?: string
  beatId?: string
  supervisorId?: string
  rank?: string
}

export async function signUp(data: SignupData) {
  const supabase = createClient()

  // Step 1: Create auth user
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
        role: data.role,
        phone: data.phone,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    console.error('Signup auth error:', error)
    // Provide better error messages
    if (error.message?.includes('Database error')) {
      throw new Error(
        'Database tables not set up. Please run the SQL migrations in Supabase SQL Editor first. (See supabase/migrations/RESET_AND_MIGRATE.sql)'
      )
    }
    if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
      throw new Error('This email is already registered. Try signing in instead.')
    }
    throw new Error(error.message || 'Signup failed')
  }

  if (!authData.user) throw new Error('Signup failed — no user returned')

  // Check if this was a duplicate signup (Supabase returns a fake user with no identities)
  if (authData.user.identities && authData.user.identities.length === 0) {
    throw new Error('This email is already registered. Try signing in instead.')
  }

  // Step 2: For police roles, create officer profile
  const policeRoles = ['constable', 'si', 'sho', 'dsp']
  if (policeRoles.includes(data.role) && data.badgeNumber) {
    const { error: officerError } = await supabase
      .from('officer_profiles')
      .insert({
        id: authData.user.id,
        badge_number: data.badgeNumber,
        rank: data.rank ?? data.role.toUpperCase(),
        role: data.role,
        station_id: data.stationId ?? null,
        beat_id: data.beatId ?? null,
        zone_id: data.zoneId ?? null,
        supervisor_id: data.supervisorId ?? null,
        is_verified: false,
      })
    if (officerError) {
      console.error('Officer profile error:', officerError)
      throw new Error(`Officer profile creation failed: ${officerError.message}`)
    }
  }

  return authData
}
