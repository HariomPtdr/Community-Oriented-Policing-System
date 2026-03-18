'use server'

import { createClient } from '@/lib/supabase/server'
import type { ComplainantStep, IncidentStep, SimpleTheftData, CyberCrimeData, CheatingFraudData, BurglaryData, NcrData } from '@/lib/types/report'

// ── Create Draft (Step 1 complete) ──────────────────────────

export async function createReportDraft(data: ComplainantStep) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: result, error } = await supabase
    .from('incidents')
    .insert({
      reporter_id: user.id,
      title: 'Draft Report',
      description: 'Draft — completing report wizard',
      category: 'other',
      priority: 'medium',
      status: 'draft',
      filing_mode: data.filingMode,
      behalf_name: data.behalfName || null,
      behalf_relation: data.behalfRelation || null,
      behalf_contact: data.behalfContact || null,
      c_full_name: data.fullName,
      c_father_name: data.fatherName || null,
      c_mother_name: data.motherName || null,
      c_mobile: data.mobile,
      c_alt_mobile: data.altMobile || null,
      c_email: data.email || null,
      c_gender: data.gender || null,
      c_state: (data as any).state || null,
      c_district: data.district || null,
      c_city: (data as any).city || null,
      c_pincode: (data as any).pincode || null,
      c_tehsil: (data as any).tehsil || null,
      c_address: data.address || null,
      c_police_station: data.policeStation || null,
      id_proof_type: (data as any).idProofType || null,
      id_proof_number: (data as any).idProofNumber || null,
      current_step: 1,
    })
    .select('id')
    .single()

  if (error) throw error
  return result.id
}

// ── Update Step 1 (for editing existing draft) ──────────────

export async function updateComplainantStep(incidentId: string, data: ComplainantStep) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('incidents')
    .update({
      filing_mode: data.filingMode,
      behalf_name: data.behalfName || null,
      behalf_relation: data.behalfRelation || null,
      behalf_contact: data.behalfContact || null,
      c_full_name: data.fullName,
      c_father_name: data.fatherName || null,
      c_mother_name: data.motherName || null,
      c_mobile: data.mobile,
      c_alt_mobile: data.altMobile || null,
      c_email: data.email || null,
      c_gender: data.gender || null,
      c_state: (data as any).state || null,
      c_district: data.district || null,
      c_city: (data as any).city || null,
      c_pincode: (data as any).pincode || null,
      c_tehsil: (data as any).tehsil || null,
      c_address: data.address || null,
      c_police_station: data.policeStation || null,
      id_proof_type: (data as any).idProofType || null,
      id_proof_number: (data as any).idProofNumber || null,
    })
    .eq('id', incidentId)
    .eq('reporter_id', user.id)

  if (error) throw error
}

// ── Save Step 2 (Incident Details) ──────────────────────────

export async function saveIncidentStep(incidentId: string, data: IncidentStep) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Try to lookup station_id
  let stationId = null
  if (data.district && data.policeStation) {
    const { data: station } = await supabase
      .from('stations')
      .select('id')
      .ilike('name', `%${data.policeStation}%`)
      .limit(1)
      .maybeSingle()
    stationId = station?.id || null
  }

  const { error } = await supabase
    .from('incidents')
    .update({
      i_state: data.state,
      i_district: data.district,
      i_city: data.city,
      i_pincode: (data as any).pincode || null,
      i_tehsil: (data as any).tehsil || null,
      i_address: (data as any).address || null,
      i_police_station: data.policeStation,
      i_date: data.date,
      i_approx_time: data.approxTime || null,
      complaint_type: data.complaintType,
      station_id: stationId,
      current_step: 2,
    })
    .eq('id', incidentId)
    .eq('reporter_id', user.id)

  if (error) throw error
}

// ── Save Step 3: Simple Theft ───────────────────────────────

export async function saveSimpleTheft(incidentId: string, data: SimpleTheftData) {
  const supabase = await createClient()

  const { error: detailErr } = await supabase
    .from('incident_simple_theft')
    .upsert({
      incident_id: incidentId,
      property_type: data.propertyType,
      property_description: data.propertyDescription,
      property_details: data.propertyDetails || {},
      estimated_price: data.estimatedPrice || null,
      suspect_name: data.hasSuspect ? data.suspectName || null : null,
      suspect_address: data.hasSuspect ? data.suspectAddress || null : null,
      suspect_description: data.hasSuspect ? data.suspectDescription || null : null,
      suspect_phone: data.hasSuspect ? data.suspectPhone || null : null,
    }, { onConflict: 'incident_id' })

  if (detailErr) throw detailErr

  let extendedDescription = data.detailedDescription
  if (data.propertyDetails && Object.keys(data.propertyDetails).length > 0) {
    const detailsStr = Object.entries(data.propertyDetails)
      .map(([k, v]) => `${k.replace(/_/g, ' ').toUpperCase()}: ${v}`)
      .join(' | ')
    extendedDescription = `${data.detailedDescription}\n\n[PROPERTY DETAILS]\n${detailsStr}`
  }

  const { error } = await supabase
    .from('incidents')
    .update({
      detailed_description: extendedDescription,
      has_suspect: data.hasSuspect,
      current_step: 3,
    })
    .eq('id', incidentId)

  if (error) throw error
}

// ── Save Step 3: Cyber Crime ────────────────────────────────

export async function saveCyberCrime(incidentId: string, data: CyberCrimeData) {
  const supabase = await createClient()

  const { error: detailErr } = await supabase
    .from('incident_cyber_crime')
    .upsert({
      incident_id: incidentId,
      cyber_type: data.cyberType,
      cyber_type_details: data.cyberTypeDetails || {},
      platform_used: data.platformUsed ? [data.platformUsed] : [],
      platform_details: data.platformDetails || {},
      platform_other_desc: data.platformOtherDesc || null,
      website_url: data.websiteUrl || null,
      amount_lost: data.amountLost || null,
      transaction_id: data.transactionId || null,
      upi_id: data.upiId || null,
      ifsc_code: data.ifscCode || null,
      bank_name: data.bankName || null,
      date_of_transaction: data.dateOfTransaction || null,
      suspect_name: data.hasSuspect ? data.suspectName || null : null,
      suspect_phone: data.hasSuspect ? data.suspectPhone || null : null,
      suspect_website: data.hasSuspect ? data.suspectWebsite || null : null,
      suspect_social_handle: data.hasSuspect ? data.suspectSocialHandle || null : null,
      suspect_description: data.hasSuspect ? data.suspectDescription || null : null,
    }, { onConflict: 'incident_id' })

  if (detailErr) throw detailErr

  // Build extended description with all structured details
  let extDesc = data.detailedDescription
  const sections: string[] = []
  if (data.cyberTypeDetails && Object.keys(data.cyberTypeDetails).length > 0) {
    sections.push('[CYBER CRIME TYPE DETAILS]\n' + Object.entries(data.cyberTypeDetails).filter(([,v]) => v).map(([k, v]) => `${k.replace(/_/g, ' ').toUpperCase()}: ${v}`).join(' | '))
  }
  if (data.platformUsed && data.platformDetails && Object.keys(data.platformDetails).length > 0) {
    sections.push(`[PLATFORM: ${data.platformUsed.toUpperCase()}]\n` + Object.entries(data.platformDetails).filter(([,v]) => v).map(([k, v]) => `${k.replace(/_/g, ' ').toUpperCase()}: ${v}`).join(' | '))
  }
  if (sections.length > 0) extDesc = `${data.detailedDescription}\n\n${sections.join('\n\n')}`

  const { error } = await supabase
    .from('incidents')
    .update({
      detailed_description: extDesc,
      has_suspect: data.hasSuspect,
      current_step: 3,
    })
    .eq('id', incidentId)

  if (error) throw error
}

// ── Save Step 3: Cheating/Fraud ─────────────────────────────

export async function saveCheatingFraud(incidentId: string, data: CheatingFraudData) {
  const supabase = await createClient()

  const { error: detailErr } = await supabase
    .from('incident_cheating_fraud')
    .upsert({
      incident_id: incidentId,
      fraud_type: data.fraudType,
      fraud_details: data.fraudDetails || {},
      fraud_amount: data.fraudAmount || null,
      payment_method: data.paymentMethod || null,
      has_transaction: data.hasTransaction,
      transaction_id: data.hasTransaction ? data.transactionId || null : null,
      bank_name: data.hasTransaction ? data.bankName || null : null,
      account_number: data.hasTransaction ? data.accountNumber || null : null,
      ifsc_code: data.hasTransaction ? data.ifscCode || null : null,
      upi_id: data.hasTransaction ? data.upiId || null : null,
      suspect_name: data.hasSuspect ? data.suspectName || null : null,
      suspect_mob: data.hasSuspect ? data.suspectMob || null : null,
      suspect_address: data.hasSuspect ? data.suspectAddress || null : null,
      suspect_company: data.hasSuspect ? data.suspectCompany || null : null,
      suspect_website: data.hasSuspect ? data.suspectWebsite || null : null,
      suspect_bank_acc: data.hasSuspect ? data.suspectBankAcc || null : null,
    }, { onConflict: 'incident_id' })

  if (detailErr) throw detailErr

  let extDesc = data.detailedDescription
  if (data.fraudDetails && Object.keys(data.fraudDetails).length > 0) {
    const detailsStr = Object.entries(data.fraudDetails).filter(([,v]) => v).map(([k, v]) => `${k.replace(/_/g, ' ').toUpperCase()}: ${v}`).join(' | ')
    extDesc = `${data.detailedDescription}\n\n[FRAUD TYPE DETAILS]\n${detailsStr}`
  }

  const { error } = await supabase
    .from('incidents')
    .update({
      detailed_description: extDesc,
      has_suspect: data.hasSuspect,
      current_step: 3,
    })
    .eq('id', incidentId)

  if (error) throw error
}

// ── Save Step 3: Burglary ───────────────────────────────────

export async function saveBurglary(incidentId: string, data: BurglaryData) {
  const supabase = await createClient()

  const { error: detailErr } = await supabase
    .from('incident_burglary')
    .upsert({
      incident_id: incidentId,
      premises_type: data.premisesType,
      premises_details: data.premisesDetails || {},
      entry_method: data.entryMethod || null,
      cctv_available: data.cctvAvailable,
      stolen_property_desc: data.stolenPropertyDesc,
      estimated_value: data.estimatedValue || null,
      suspect_name: data.hasSuspect ? data.suspectName || null : null,
      suspect_address: data.hasSuspect ? data.suspectAddress || null : null,
      suspect_description: data.hasSuspect ? data.suspectDescription || null : null,
    }, { onConflict: 'incident_id' })

  if (detailErr) throw detailErr

  let extDesc = data.detailedDescription
  if (data.premisesDetails && Object.keys(data.premisesDetails).length > 0) {
    const detailsStr = Object.entries(data.premisesDetails).filter(([,v]) => v).map(([k, v]) => `${k.replace(/_/g, ' ').toUpperCase()}: ${v}`).join(' | ')
    extDesc = `${data.detailedDescription}\n\n[PREMISES DETAILS]\n${detailsStr}`
  }

  const { error } = await supabase
    .from('incidents')
    .update({
      detailed_description: extDesc,
      has_suspect: data.hasSuspect,
      current_step: 3,
    })
    .eq('id', incidentId)

  if (error) throw error
}

// ── Save Step 3: NCR ────────────────────────────────────────

export async function saveNcr(incidentId: string, data: NcrData) {
  const supabase = await createClient()

  const { error: detailErr } = await supabase
    .from('incident_ncr')
    .upsert({
      incident_id: incidentId,
      ncr_type: data.ncrType,
      description: data.description,
      suspect_name: data.suspectName || null,
      suspect_address: data.suspectAddress || null,
      suspect_phone: data.suspectPhone || null,
      suspect_description: data.suspectDescription || null,
    }, { onConflict: 'incident_id' })

  if (detailErr) throw detailErr

  const { error } = await supabase
    .from('incidents')
    .update({
      detailed_description: data.description,
      current_step: 3,
    })
    .eq('id', incidentId)

  if (error) throw error
}

// ── Submit Report (Final) ───────────────────────────────────

export async function submitReport(
  incidentId: string,
  signaturePath: string | null,
  recoveryData?: { yourLoss?: number; totalEstimatedLoss?: number }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // First get draft to build title
  const { data: draft } = await supabase
    .from('incidents')
    .select('complaint_type, c_full_name, detailed_description, i_city')
    .eq('id', incidentId)
    .eq('reporter_id', user.id)
    .single()

  const typeLabel = draft?.complaint_type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Report'

  const { error } = await supabase
    .from('incidents')
    .update({
      status: 'submitted',
      title: `${typeLabel} — ${draft?.i_city || 'Unknown'}`,
      description: draft?.detailed_description || 'No description provided',
      citizen_signature: signaturePath,
      your_loss_amount: recoveryData?.yourLoss || null,
      total_estimated_loss: recoveryData?.totalEstimatedLoss || null,
      current_step: 4,
    })
    .eq('id', incidentId)
    .eq('reporter_id', user.id)

  if (error) throw error

  // Insert status history
  await supabase.from('incident_status_history').insert({
    incident_id: incidentId,
    changed_by: user.id,
    old_status: 'draft',
    new_status: 'submitted',
    note: 'Report submitted by citizen',
  })

  return incidentId
}

// ── Get Draft (Resume) ──────────────────────────────────────

export async function getDraft(incidentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('incidents')
    .select(`
      *,
      incident_simple_theft(*),
      incident_cyber_crime(*),
      incident_cheating_fraud(*),
      incident_burglary(*),
      incident_ncr(*),
      incident_evidence(*)
    `)
    .eq('id', incidentId)
    .eq('reporter_id', user.id)
    .single()

  if (error) throw error
  return data
}

// ── Get User's Drafts ───────────────────────────────────────

export async function getUserDrafts() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('incidents')
    .select('id, complaint_type, current_step, created_at, c_full_name, i_city')
    .eq('reporter_id', user.id)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(5)

  return data || []
}
