import { createClient } from '@/lib/supabase/client'
import { ROLE_HOME } from '@/lib/types'

export async function signIn(email: string, password: string) {
  const supabase = createClient()

  // Validate inputs
  if (!email || !password) {
    throw new Error('Email and password are required.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  
  if (error) {
    // Provide user-friendly error messages
    if (error.message?.includes('Invalid login credentials')) {
      throw new Error('Invalid email or password. Please check your credentials and try again.')
    }
    if (error.message?.includes('Email not confirmed')) {
      throw new Error('Your email is not confirmed. Please check your inbox.')
    }
    if (error.message?.includes('Invalid Refresh Token')) {
      // Clear stale session and ask user to try again
      await supabase.auth.signOut()
      throw new Error('Your session has expired. Please try signing in again.')
    }
    throw new Error(error.message || 'Login failed. Please try again.')
  }

  if (!data?.user) {
    throw new Error('Login failed. No user data returned.')
  }

  // Fetch profile with role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile) {
    console.error('Profile fetch error:', profileError)
    // Don't sign out — user exists but profile might be incomplete
    // Default to citizen role
    return { user: data.user, role: 'citizen', redirectTo: ROLE_HOME['citizen'] ?? '/citizen/dashboard' }
  }

  const role = profile.role as string

  // Check police verification only for police roles
  const policeRoles = ['constable', 'si', 'sho', 'dsp']
  if (policeRoles.includes(role)) {
    const { data: officerProfile } = await supabase
      .from('officer_profiles')
      .select('is_verified, is_active')
      .eq('id', data.user.id)
      .single()

    if (officerProfile) {
      if (!officerProfile.is_verified) {
        await supabase.auth.signOut()
        throw new Error('Your account is pending verification by your SHO or Admin. Please contact your station.')
      }
      if (!officerProfile.is_active) {
        await supabase.auth.signOut()
        throw new Error('Your account has been suspended. Contact your station admin.')
      }
    }
    // If no officer profile exists yet, allow login — admin can set it up later
  }

  return { user: data.user, role, redirectTo: ROLE_HOME[role] ?? '/citizen/dashboard' }
}

export async function signOut() {
  const supabase = createClient()
  try {
    await supabase.auth.signOut()
  } catch {
    // Ignore signout errors (e.g., already signed out, stale token)
  }
  window.location.href = '/login'
}

export async function resetPassword(email: string) {
  const supabase = createClient()
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  })
}
