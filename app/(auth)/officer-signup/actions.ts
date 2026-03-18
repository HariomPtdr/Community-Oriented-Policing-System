'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { officerRegistrationSchema } from '@/lib/validations/officer-register'
import { headers } from 'next/headers'

export async function registerOfficer(formData: any) {
  const supabase = await createClient()
  
  // 1. Validate
  const result = officerRegistrationSchema.safeParse(formData)
  if (!result.success) {
    return { error: 'Validation failed', details: result.error.flatten().fieldErrors }
  }

  const input = result.data

  try {
    // 2. Auth signup
    console.log('Step 2: Starting Auth signUp for', input.email)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName,
          role: input.accountType,
        }
      }
    })

    if (authError) {
      console.error('Auth Error:', authError.message)
      if (authError.message.includes('confirmation email')) {
        return { 
          error: "Account created but verification email failed. Please contact admin to activate manually.",
          isAuthError: true
        }
      }
      return { error: authError.message }
    }

    const userId = authData.user?.id
    if (!userId) return { error: 'Failed to create user account' }
    console.log('Auth successful, User ID:', userId)
    // 3. Profiles update (trigger already created basic profile)
    console.log('Step 3: Updating profiles table with extended details')
    const { error: profileError } = await supabase.from('profiles').update({
      full_name: input.fullName,
      phone: input.mobile,
      alternate_mobile: input.altMobile,
      email: input.email,
      official_email: input.officialEmail,
      gender: input.gender,
      date_of_birth: input.dateOfBirth,
      blood_group: input.bloodGroup,
      father_husband_name: input.fatherName,
      mother_name: input.motherName,
      id_proof_type: input.idProofType,
      id_number: input.idProofNumber,
      role: input.accountType,
      is_active: false,
      pincode: input.pincode,
      state: input.state,
      district: input.district,
      city_town: input.cityTown,
      tehsil_division: input.tehsilDivision,
      full_address: input.fullAddress
    }).eq('id', userId)

    if (profileError) {
      console.error('Profile Update Error:', profileError)
      return { error: profileError.message }
    }

    // 4. Officer profiles insert
    console.log('Step 4: Inserting into officer_profiles table')
    const reqHeaders = await headers()
    const { error: officerError } = await supabase.from('officer_profiles').insert({
      id: userId,
      badge_number: input.badgeNumber,
      employee_id: input.employeeId,
      rank: input.accountType.toUpperCase(),
      role: input.accountType,
      joining_date: input.joiningDate,
      department: input.department,
      specialization: input.specialization,
      previous_station_id: input.previousStationId,
      approval_status: 'pending_admin_approval',
      registration_ip: reqHeaders.get('x-forwarded-for'),
      registration_device: reqHeaders.get('user-agent'),
      station_id: input.stationId,
      zone_id: input.zoneId,
      beat_id: input.neighborhoodId
    })

    if (officerError) {
      console.error('Officer Profile Insert Error:', officerError)
      return { error: officerError.message }
    }

    // 5. Emergency contact
    console.log('Step 5: Inserting into emergency contacts')
    await supabase.from('officer_emergency_contacts').insert({
      officer_id: userId,
      contact_name: input.contactName,
      relationship: input.relationship,
      mobile: input.emergencyMobile,
      alt_mobile: input.emergencyAltMobile,
      address: input.emergencyAddress
    })

    // 6. Log submission
    console.log('Step 6: Logging submission')
    await supabase.from('officer_approval_log').insert({
      officer_id: userId,
      action: 'submitted',
      new_status: 'pending_admin_approval',
      note: 'Registration submitted. Awaiting verification.'
    })

    console.log('Registration complete for:', userId)
    return { success: true, officerId: userId }
  } catch (err: any) {
    console.error('Unexpected Registration Error:', err)
    return { error: err.message || 'An unexpected error occurred' }
  }
}

export async function checkBadgeNumber(badge: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('officer_profiles')
    .select('id')
    .eq('badge_number', badge)
    .maybeSingle()
    
  if (error) return { error: error.message }
  return { available: !data }
}
export async function approveOfficer(officerId: string, notes?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Check if admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'sho', 'dsp'].includes(profile?.role || '')) return { error: 'Insufficient permissions' }

  const { error } = await supabase
    .from('officer_profiles')
    .update({ 
      approval_status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', officerId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function rejectOfficer(officerId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('officer_profiles')
    .update({ 
      approval_status: 'rejected',
      rejection_reason: reason,
      rejected_at: new Date().toISOString()
    })
    .eq('id', officerId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function uploadOfficerDocument(
  officerId: string,
  storagePath: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  docType: any
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== officerId) return { error: 'Unauthorized' }

  const { error } = await supabase.from('officer_uploaded_documents').insert({
    officer_id: officerId,
    storage_path: storagePath,
    file_name: fileName,
    file_size: fileSize,
    mime_type: mimeType,
    doc_type: docType
  })

  if (error) return { error: error.message }
  return { success: true }
}
