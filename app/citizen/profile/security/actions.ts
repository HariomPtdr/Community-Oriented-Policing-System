'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { rateLimiters, checkRateLimit } from '@/lib/ratelimit'
import {
  changePasswordSchema,
  totpVerifySchema,
  privacyControlsSchema,
  securityNotifPrefsSchema,
  deletionRequestSchema,
  backupCodeSchema,
  generalSettingsSchema
} from '@/lib/validations/security'
import { sendSecurityEmail } from '@/lib/mail'
import { generateSecret, generateURI, verifySync as verify } from 'otplib'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// --- Crypto Utils ---
const getEncryptionKey = () => {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'default_secret_key_32_chars_long_01'
  return crypto.createHash('sha256').update(secret).digest()
}

const encrypt = (text: string) => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

const decrypt = (encText: string) => {
  const [ivHex, tagHex, encryptedHex] = encText.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

// Ensure error response utility
function errorResponse(error: string, extra?: any) {
  return { error, ...extra }
}


// --- Actions ---

export async function changePassword(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return errorResponse('Not authenticated')

  const rl = await checkRateLimit(rateLimiters.changePassword, `change_password:${user.id}`)
  if (!rl.allowed) return errorResponse(`Too many attempts. Try again in ${rl.retryAfter} seconds.`)

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message)

  const { currentPassword, newPassword } = parsed.data

  // Verify current password via Auth sign_in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword
  })

  // We must re-create supabase client or just ignore the user tokens overwritten
  if (signInError) {
    // log to login history
    await supabase.rpc('insert_login_history', {
      user_id_param: user.id, result_param: 'failed', method_param: 'email_password', reason_param: 'wrong_password'
    })
    
    // Trigger Failed Login email via SMTP
    if (user.email) {
      await sendSecurityEmail(user.id, user.email, 'FAILED_LOGIN', {
        ip: 'User Device' // We can extract headers in a real req, fallback here.
      })
    }
    
    return errorResponse('Current password is incorrect')
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
  if (updateError) return errorResponse(updateError.message || 'Failed to update password')

  // Revoke all other sessions
  await supabase
    .from('user_sessions')
    .update({ is_revoked: true, revoked_by: 'auto_password_change', revoked_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_current', false)

  await supabase.rpc('insert_login_history', {
    user_id_param: user.id, result_param: 'success', method_param: 'email_password', reason_param: null
  })

  // Trigger Password Changed email via SMTP
  if (user.email) {
    await sendSecurityEmail(user.id, user.email, 'PASSWORD_CHANGE', {})
  }

  revalidatePath('/citizen/profile')
  return { success: true, message: 'Password updated. All other devices have been signed out.' }
}


export async function initiateTotpSetup() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Not authenticated')

  const { data: config } = await supabase.from('two_factor_config').select('is_enabled').eq('user_id', user.id).single()
  if (config?.is_enabled) return errorResponse('2FA is already enabled. Disable first.')

  const secret = generateSecret()
  const qrCodeUri = generateURI({
    issuer: 'COPS - Community Policing',
    label: user.email || 'user',
    secret
  })

  const encryptedSecret = encrypt(secret)
  
  // Set setup cookie
  const cookieStore = await cookies()
  cookieStore.set('cops_totp_setup', encryptedSecret, { httpOnly: true, secure: true, maxAge: 600 })

  return { secret, qrCodeUri, success: true }
}


export async function verifyAndEnableTotp(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Not authenticated')

  const rl = await checkRateLimit(rateLimiters.totpVerify, `totp_verify:${user.id}`)
  if (!rl.allowed) return errorResponse(`Too many attempts. Try again in ${rl.retryAfter} seconds.`)

  const parsed = totpVerifySchema.safeParse({ token: formData.get('token') })
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message)

  const cookieStore = await cookies()
  const setupCookie = cookieStore.get('cops_totp_setup')
  if (!setupCookie) return errorResponse('Setup session expired. Please start again.')

  let secret: string
  try {
    secret = decrypt(setupCookie.value)
  } catch (e) {
    return errorResponse('Invalid setup token. Please start again.')
  }

  const isValid = verify({ token: parsed.data.token, secret }).valid
  if (!isValid) return errorResponse('Invalid code or expired. Try again.')

  // Generate backup codes
  const plainCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex').toUpperCase())
  const hashedCodes = await Promise.all(plainCodes.map(code => bcrypt.hash(code, 10)))

  const { error } = await supabase
    .from('two_factor_config')
    .update({
      method: 'totp',
      is_enabled: true,
      totp_secret: encrypt(secret),
      totp_verified: true,
      enabled_at: new Date().toISOString(),
      backup_codes: hashedCodes,
      backup_codes_generated_at: new Date().toISOString(),
      backup_codes_remaining: 8
    })
    .eq('user_id', user.id)

  if (error) return errorResponse('Failed to enable 2FA')

  cookieStore.delete('cops_totp_setup')
  revalidatePath('/citizen/profile')
  return { success: true, backupCodes: plainCodes }
}


export async function disableTwoFactor(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Not authenticated')

  const currentPassword = formData.get('currentPassword') as string
  if (!currentPassword) return errorResponse('Password required')

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword
  })
  if (signInError) return errorResponse('Password incorrect. Cannot disable 2FA.')

  // We should also verify TOTP if they had it enabled
  const { data: config } = await supabase.from('two_factor_config').select('method, totp_secret').eq('user_id', user.id).single()
  
  if (config?.method === 'totp') {
    const token = formData.get('totpToken') as string
    if (!token) return errorResponse('Current Authenticator code required')
    if (!config.totp_secret) return errorResponse('No TOTP secret stored')
    
    let secret = ''
    try { secret = decrypt(config.totp_secret) } catch(e) { return errorResponse('Decryption failed') }
    
    const isValid = verify({ token, secret }).valid
    if (!isValid) return errorResponse('Invalid Authenticator code')
  }

  await supabase.from('two_factor_config').update({
    method: 'disabled',
    is_enabled: false,
    totp_secret: null,
    backup_codes: null,
    totp_verified: false
  }).eq('user_id', user.id)

  // Revoke other sessions
  await supabase
    .from('user_sessions')
    .update({ is_revoked: true, revoked_by: 'user', revoked_at: new Date().toISOString() })
    .eq('user_id', user.id).eq('is_current', false)

  revalidatePath('/citizen/profile')
  return { success: true }
}


export async function useBackupCode(formData: FormData) {
  // Wait, useBackupCode is normally during login, but it can be implemented here
  return errorResponse('Backup code usage is handled during the login flow.')
}


export async function revokeSession(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Not authenticated')

  const rl = await checkRateLimit(rateLimiters.revokeSession, `revoke_session:${user.id}`)
  if (!rl.allowed) return errorResponse(`Rate limited. Try again later.`)

  const { data } = await supabase.from('user_sessions').select('is_current, is_revoked').eq('id', sessionId).eq('user_id', user.id).single()
  if (!data) return errorResponse('Session not found')
  if (data.is_current) return errorResponse('Cannot revoke your current session')
  if (data.is_revoked) return errorResponse('Already revoked')

  await supabase.from('user_sessions').update({ is_revoked: true, revoked_at: new Date().toISOString(), revoked_by: 'user' }).eq('id', sessionId)
  
  revalidatePath('/citizen/profile')
  return { success: true }
}


export async function revokeAllOtherSessions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Not authenticated')

  const { error } = await supabase.from('user_sessions')
    .update({ is_revoked: true, revoked_at: new Date().toISOString(), revoked_by: 'user' })
    .eq('user_id', user.id)
    .eq('is_current', false)
    .eq('is_revoked', false)

  if (error) return errorResponse('Failed to revoke sessions')

  revalidatePath('/citizen/profile')
  return { success: true, message: 'All other sessions signed out' }
}


export async function updateSecurityNotifPrefs(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Not authenticated')

  const parsed = securityNotifPrefsSchema.safeParse(Object.fromEntries(formData.entries() as any))
  if (!parsed.success) return errorResponse('Invalid preferences')

  await supabase.from('security_notifications_prefs').upsert({
    user_id: user.id,
    notify_new_device_login: parsed.data.notifyNewDeviceLogin ?? true,
    notify_password_change: parsed.data.notifyPasswordChange ?? true,
    notify_fir_status_change: parsed.data.notifyFirStatusChange ?? true,
    notify_new_device_linked: parsed.data.notifyNewDeviceLinked ?? true,
    notify_failed_logins: parsed.data.notifyFailedLogins ?? true,
    notify_account_accessed: parsed.data.notifyAccountAccessed ?? false,
    via_email: parsed.data.viaEmail ?? true,
    via_sms: parsed.data.viaSms ?? true,
    via_push: parsed.data.viaPush ?? false,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' })

  revalidatePath('/citizen/profile')
  return { success: true }
}


export async function updatePrivacyControls(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Not authenticated')

  // Support JSON objects from client components instead of FormData directly
  let dataObj: any = {}
  if (formData.has('data')) {
    dataObj = JSON.parse(formData.get('data') as string)
  } else {
    dataObj = {
      forumNameVisibility: formData.get('forumNameVisibility'),
      allowOfficerProfileView: formData.get('allowOfficerProfileView') === 'true',
      anonymousByDefault: formData.get('anonymousByDefault') === 'true',
      hideLastSeen: formData.get('hideLastSeen') === 'true',
    }
  }

  const parsed = privacyControlsSchema.safeParse(dataObj)
  if (!parsed.success) return errorResponse('Invalid parameters')

  if (!parsed.data.allowOfficerProfileView) {
    const { data: firs } = await supabase.from('incidents')
      .select('fir_number, status')
      .eq('reporter_id', user.id)
      .not('status', 'in', '("resolved", "closed", "rejected")')
      
    if (firs && firs.length > 0) {
      return { 
        error: 'Officer profile access is required while you have active FIRs.',
        activeFirCount: firs.length,
        firNumbers: firs.map(f => f.fir_number).filter(Boolean)
      }
    }
  }

  await supabase.from('privacy_controls').upsert({
    user_id: user.id,
    forum_name_visibility: parsed.data.forumNameVisibility,
    allow_officer_profile_view: parsed.data.allowOfficerProfileView,
    anonymous_by_default: parsed.data.anonymousByDefault,
    hide_last_seen: parsed.data.hideLastSeen,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' })

  revalidatePath('/citizen/profile')
  return { success: true }
}


export async function requestDataExport() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Not authenticated')

  const rl = await checkRateLimit(rateLimiters.dataExport, `data_export:${user.id}`)
  if (!rl.allowed) return errorResponse(`Rate limit: Try again in ${rl.retryAfter} seconds.`)

  const { data: recent } = await supabase.from('data_export_requests')
    .select('*')
    .eq('user_id', user.id)
    .gt('requested_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .single()

  if (recent) {
    return errorResponse(`Export already requested recently. Please wait 10 minutes between requests.`)
  }

  // 1. Fetch primary data
  const [
    { data: profile },
    { data: officerProfile },
    { data: incidents },
    { data: sessions },
    { data: logins },
    { data: messagesSent },
    { data: messagesReceived },
    { data: notifications },
    { data: sosEvents },
    { data: forumPosts },
    { data: complaintsFiled },
    { data: complaintsAgainst },
    { data: surveyResponses },
    { data: activityLog },
    { data: chatRooms }
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('officer_profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('incidents').select('*').eq('reporter_id', user.id),
    supabase.from('user_sessions').select('*').eq('user_id', user.id),
    supabase.from('login_history').select('*').eq('user_id', user.id),
    supabase.from('messages').select('*').eq('sender_id', user.id),
    supabase.from('messages').select('*').eq('recipient_id', user.id),
    supabase.from('notifications').select('*').eq('user_id', user.id),
    supabase.from('sos_events').select('*').eq('user_id', user.id),
    supabase.from('forum_posts').select('*').eq('author_id', user.id),
    supabase.from('complaints').select('*').eq('filed_by', user.id),
    supabase.from('complaints').select('*').eq('against_officer_id', user.id),
    supabase.from('survey_responses').select('*').eq('respondent_id', user.id),
    supabase.from('citizen_activity_log').select('*').eq('user_id', user.id),
    supabase.from('chat_rooms').select('*').or(`citizen_id.eq.${user.id},officer_id.eq.${user.id}`)
  ])

  // 2. Fetch Dependent Data
  const incidentIds = incidents?.map(i => i.id) || []
  const roomIds = chatRooms?.map(r => r.id) || []

  const [
    { data: simpleTheft },
    { data: cyberCrime },
    { data: cheatingFraud },
    { data: burglary },
    { data: ncr },
    { data: evidence },
    { data: statusHistory },
    { data: chatMessages }
  ] = await Promise.all([
    incidentIds.length ? supabase.from('incident_simple_theft').select('*').in('incident_id', incidentIds) : Promise.resolve({ data: [] }),
    incidentIds.length ? supabase.from('incident_cyber_crime').select('*').in('incident_id', incidentIds) : Promise.resolve({ data: [] }),
    incidentIds.length ? supabase.from('incident_cheating_fraud').select('*').in('incident_id', incidentIds) : Promise.resolve({ data: [] }),
    incidentIds.length ? supabase.from('incident_burglary').select('*').in('incident_id', incidentIds) : Promise.resolve({ data: [] }),
    incidentIds.length ? supabase.from('incident_ncr').select('*').in('incident_id', incidentIds) : Promise.resolve({ data: [] }),
    incidentIds.length ? supabase.from('incident_evidence').select('*').in('incident_id', incidentIds).eq('uploaded_by', user.id) : Promise.resolve({ data: [] }),
    incidentIds.length ? supabase.from('incident_status_history').select('*').in('incident_id', incidentIds) : Promise.resolve({ data: [] }),
    roomIds.length ? supabase.from('chat_messages').select('*').in('room_id', roomIds) : Promise.resolve({ data: [] })
  ])

  // Helper to convert array of objects to CSV string
  const toCsv = (title: string, arr: any[]) => {
    let section = `--- ${title.toUpperCase()} ---\n`
    if (!arr || !arr.length) return section + 'No data\n\n'
    const headers = Object.keys(arr[0])
    const rows = arr.map(obj => 
      headers.map(h => {
        let val = obj[h] === null || obj[h] === undefined ? '' : String(obj[h])
        val = val.replace(/"/g, '""') // escape quotes
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val}"`
        }
        return val
      }).join(',')
    )
    return section + [headers.join(','), ...rows].join('\n') + '\n\n'
  }

  let exportData = `COPS PLATFORM DATA EXPORT\n`
  exportData += `Generated At:,${new Date().toISOString()}\n`
  exportData += `User ID:,${user.id}\n`
  exportData += `Email:,${user.email}\n`
  exportData += `Notice:,This file contains all your personal data stored on the COPS platform.\n\n`

  exportData += toCsv('PROFILE INFO', [profile])
  if (officerProfile) exportData += toCsv('OFFICER PROFILE', [officerProfile])
  exportData += toCsv('FILED REPORTS (CORE)', incidents || [])
  exportData += toCsv('REPORT DETAILS - SIMPLE THEFT', simpleTheft || [])
  exportData += toCsv('REPORT DETAILS - CYBER CRIME', cyberCrime || [])
  exportData += toCsv('REPORT DETAILS - CHEATING/FRAUD', cheatingFraud || [])
  exportData += toCsv('REPORT DETAILS - BURGLARY', burglary || [])
  exportData += toCsv('REPORT DETAILS - NCR', ncr || [])
  exportData += toCsv('REPORT EVIDENCE METADATA', evidence || [])
  exportData += toCsv('REPORT STATUS HISTORY', statusHistory || [])
  exportData += toCsv('MESSAGES SENT', messagesSent || [])
  exportData += toCsv('MESSAGES RECEIVED', messagesReceived || [])
  exportData += toCsv('NOTIFICATIONS', notifications || [])
  exportData += toCsv('SOS EVENTS', sosEvents || [])
  exportData += toCsv('FORUM POSTS', forumPosts || [])
  exportData += toCsv('COMPLAINTS FILED', complaintsFiled || [])
  exportData += toCsv('COMPLAINTS AGAINST ME', complaintsAgainst || [])
  exportData += toCsv('SURVEY RESPONSES', surveyResponses || [])
  exportData += toCsv('ACTIVITY LOG', activityLog || [])
  exportData += toCsv('CHAT ROOMS', chatRooms || [])
  exportData += toCsv('CHAT MESSAGES', chatMessages || [])
  exportData += toCsv('SESSIONS', sessions || [])
  exportData += toCsv('LOGIN HISTORY', logins || [])

  const base64Data = Buffer.from(exportData).toString('base64')
  const downloadUrl = `data:text/csv;base64,${base64Data}`
  const fileSizeBytes = Buffer.byteLength(exportData, 'utf8')

  const { error } = await supabase.from('data_export_requests').insert({
    user_id: user.id,
    status: 'ready',
    download_url: downloadUrl,
    file_size_bytes: fileSizeBytes,
    ready_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  })

  if (error) return errorResponse('Failed to generate export data. Error: ' + error.message)

  revalidatePath('/citizen/profile')
  return { success: true, message: 'Export generated successfully! You can download it now.' }
}


export async function requestAccountDeletion(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Not authenticated')

  const data = Object.fromEntries(formData.entries())
  const parsed = deletionRequestSchema.safeParse({ confirmationText: data.confirmationText, reason: data.reason || '' })
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message)

  const password = data.password as string
  if (!password) return errorResponse('Password required for deletion')

  const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email!, password })
  if (signInError) return errorResponse('Password incorrect. Cannot process deletion.')

  // Block Check
  const { data: firs } = await supabase.from('incidents')
    .select('fir_number')
    .eq('reporter_id', user.id)
    .not('status', 'in', '("resolved", "closed", "rejected")')

  if (firs && firs.length > 0) {
    await supabase.from('account_deletion_requests').insert({
      user_id: user.id,
      status: 'blocked_open_firs',
      reason: parsed.data.reason || null,
      blocked_reason: 'has_open_firs',
      open_fir_count: firs.length
    })
    return {
      blocked: true,
      reason: `You have ${firs.length} open FIR(s). These must be resolved before account deletion.`,
      openFirs: firs.map(f => f.fir_number)
    }
  }

  const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await supabase.from('account_deletion_requests').insert({
    user_id: user.id,
    status: 'pending_review',
    reason: parsed.data.reason || null,
    scheduled_for: scheduledFor,
    confirmed_by_user: true,
    confirmation_text: parsed.data.confirmationText,
    reauth_verified: true
  })

  revalidatePath('/citizen/profile')
  return { success: true, scheduledFor, message: 'Deletion scheduled for 30 days from now. Log in to cancel.' }
}


export async function cancelAccountDeletion() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Not authenticated')

  await supabase.from('account_deletion_requests').update({
    status: 'cancelled',
    cancelled_at: new Date().toISOString()
  }).eq('user_id', user.id).eq('status', 'pending_review')

  revalidatePath('/citizen/profile')
  return { success: true }
}


export async function getSecurityDashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Gather data in parallel
  const [
    tfRes,
    sessionsRes,
    historyRes,
    prefsRes,
    privacyRes,
    exportRes,
    delRes
  ] = await Promise.all([
    supabase.from('two_factor_config').select('*').eq('user_id', user.id).single(),
    supabase.from('user_sessions').select('*').eq('user_id', user.id).eq('is_revoked', false).order('last_active_at', { ascending: false }),
    supabase.from('login_history').select('*').eq('user_id', user.id).order('attempted_at', { ascending: false }).limit(20),
    supabase.from('security_notifications_prefs').select('*').eq('user_id', user.id).single(),
    supabase.from('privacy_controls').select('*').eq('user_id', user.id).single(),
    supabase.from('data_export_requests').select('*').eq('user_id', user.id).order('requested_at', { ascending: false }).limit(1),
    supabase.from('account_deletion_requests').select('*').eq('user_id', user.id).in('status', ['pending_review', 'approved']).order('requested_at', { ascending: false }).limit(1)
  ])

  const tf = tfRes.data
  const failedLogins7d = historyRes.data?.filter(
    h => (h.result === 'failed' || h.result === 'blocked') && new Date(h.attempted_at).getTime() > Date.now() - 7 * 86400000
  ).length || 0

  const securityData = {
    twoFactor: {
      isEnabled: tf?.is_enabled || false,
      method: tf?.method || 'disabled',
      enabledAt: tf?.enabled_at,
      backupCodesRemaining: tf?.backup_codes_remaining || 0
    },
    activeSessions: (sessionsRes.data || []).map(s => ({
      id: s.id,
      deviceName: s.device_name || 'Unknown Device',
      browser: s.browser || 'Unknown',
      os: s.os || 'Unknown',
      deviceType: s.device_type || 'desktop',
      city: s.city || 'Unknown',
      region: s.region || '-',
      isCurrent: s.is_current,
      lastActiveAt: s.last_active_at,
      isSuspicious: false
    })),
    loginHistory: (historyRes.data || []).map(h => ({
      id: h.id,
      attemptedAt: h.attempted_at,
      result: h.result,
      browser: h.browser || 'Unknown',
      os: h.os || 'Unknown',
      city: h.city || '-',
      region: h.region || '-',
      isSuspicious: h.is_suspicious,
      failureReason: h.failure_reason
    })),
    failedLoginCount: failedLogins7d,
    notifPrefs: prefsRes.data || {},
    privacyControls: privacyRes.data || {},
    lastPasswordChange: null,
    dataExport: {
      lastRequest: exportRes.data?.[0] ? {
        status: exportRes.data[0].status,
        requestedAt: exportRes.data[0].requested_at,
        expiresAt: exportRes.data[0].expires_at,
        downloadUrl: exportRes.data[0].download_url
      } : null,
      canRequest: !exportRes.data?.[0] || Date.now() > new Date(exportRes.data[0].requested_at).getTime() + 10 * 60 * 1000,
      nextAvailableAt: exportRes.data?.[0] ? new Date(new Date(exportRes.data[0].requested_at).getTime() + 10 * 60 * 1000) : null
    },
    pendingDeletion: {
      exists: !!delRes.data?.length,
      scheduledFor: delRes.data?.[0]?.scheduled_for || null
    }
  }

  return securityData
}

export async function getSettingsDataForPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const [
    profileRes,
    securityData
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    getSecurityDashboardData()
  ])

  return {
    profile: profileRes.data,
    ...securityData
  }
}

export async function updateGeneralSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Not authenticated')

  // Handle the boolean for volunteer explicitly if coming from FormData
  const rawData = Object.fromEntries(formData)
  const dataToParse = {
    ...rawData,
    isVolunteer: rawData.isVolunteer === 'true'
  }

  const parsed = generalSettingsSchema.safeParse(dataToParse)
  if (!parsed.success) return errorResponse(parsed.error.issues[0].message)

  const { error } = await supabase.from('profiles')
    .update({ 
      full_name: parsed.data.fullName,
      alternate_mobile: parsed.data.alternateMobile || null,
      blood_group: parsed.data.bloodGroup || null,
      is_volunteer: parsed.data.isVolunteer
    })
    .eq('id', user.id)

  if (error) return errorResponse('Failed to update district setting')

  revalidatePath('/citizen/settings')
  return { success: true }
}
