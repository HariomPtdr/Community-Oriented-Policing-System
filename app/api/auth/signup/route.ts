import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Uses service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      email, password, fullName, phone, role, badgeNumber,
      // Extended fields
      father_husband_name, mother_name, gender, alternate_mobile,
      id_proof_type, id_number, pincode, state, district, city_town, 
      tehsil_division, police_station_area, full_address 
    } = body

    // ── Validation ──────────────────────────────────────────────
    if (!email || !password || !fullName || !role) {
      return NextResponse.json({ error: 'Missing required fields: email, password, name, and role are mandatory.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    if (phone && (!/^\d{10}$/.test(phone))) {
      return NextResponse.json({ error: 'Phone number must be exactly 10 digits.' }, { status: 400 })
    }
    if (alternate_mobile && alternate_mobile.length > 0 && (!/^\d{10}$/.test(alternate_mobile))) {
      return NextResponse.json({ error: 'Alternate mobile must be exactly 10 digits.' }, { status: 400 })
    }
    if (pincode && (!/^\d{6}$/.test(pincode))) {
      return NextResponse.json({ error: 'Pincode must be exactly 6 digits.' }, { status: 400 })
    }
    if (id_number && id_number.length > 20) {
      return NextResponse.json({ error: 'ID number must be 20 characters or less.' }, { status: 400 })
    }

    const validRoles = ['citizen', 'constable', 'si', 'sho', 'dsp']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role selected.' }, { status: 400 })
    }

    const policeRoles = ['constable', 'si', 'sho', 'dsp']
    if (policeRoles.includes(role) && !badgeNumber) {
      return NextResponse.json({ error: 'Badge number is required for police roles.' }, { status: 400 })
    }

    // ── Step 1: Create auth user ────────────────────────────────
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role, phone },
    })

    if (authError) {
      console.error('Auth error:', authError.message, authError.status)
      if (authError.message?.includes('already') || authError.status === 422) {
        return NextResponse.json({ error: 'This email is already registered. Try signing in instead.' }, { status: 409 })
      }
      return NextResponse.json({ error: `Authentication error: ${authError.message}` }, { status: 400 })
    }

    if (!authData?.user) {
      return NextResponse.json({ error: 'Failed to create user account.' }, { status: 500 })
    }

    const userId = authData.user.id

    // ── Step 2: Upsert profile with ALL details ─────────────────
    // The DB trigger creates a minimal profile, but we upsert to add all extended fields.
    // Small delay to let the trigger complete first
    await new Promise(resolve => setTimeout(resolve, 300))

    const profileData = {
      id: userId,
      role: role,
      full_name: fullName,
      phone: phone || null,
      father_husband_name: father_husband_name || null,
      mother_name: mother_name || null,
      gender: gender || null,
      alternate_mobile: alternate_mobile || null,
      id_proof_type: id_proof_type || null,
      id_number: id_number || null,
      pincode: pincode || null,
      state: state || null,
      district: district || null,
      city_town: city_town || null,
      tehsil_division: tehsil_division || null,
      police_station_area: police_station_area || null,
      full_address: full_address || null,
      profile_completed: true,
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })

    if (profileError) {
      console.error('Profile upsert error:', profileError.message, profileError.code, profileError.details)
      // Don't delete the user — the trigger already created a basic profile.
      // Just log it and let the user update their profile later.
      console.warn('Profile upsert failed but user was created. User can update profile later.')
    }

    // ── Step 3: For police roles, create officer profile ────────
    if (policeRoles.includes(role) && badgeNumber) {
      const { error: officerError } = await supabaseAdmin
        .from('officer_profiles')
        .upsert({
          id: userId,
          badge_number: badgeNumber,
          rank: role.toUpperCase(),
          role: role,
          is_verified: false,
        }, { onConflict: 'id' })

      if (officerError) {
        console.error('Officer profile error:', officerError.message)
        // Don't fail the signup — officer profile can be added later by admin
      }
    }

    return NextResponse.json({
      message: 'Account created successfully!',
      userId: userId,
    })

  } catch (err) {
    console.error('Signup API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
}
