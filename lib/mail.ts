import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true' || true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// Map event types to preference fields
const PREF_MAP: Record<string, string> = {
  'NEW_DEVICE': 'notify_new_device_login',
  'PASSWORD_CHANGE': 'notify_password_change',
  'FAILED_LOGIN': 'notify_failed_logins',
  'FIR_STATUS': 'notify_fir_status_change'
}

type NotificationEvent = keyof typeof PREF_MAP

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function sendSecurityEmail(userId: string, email: string, event: NotificationEvent, data: any) {
  try {
    // 1. Fetch user preferences
    const { data: prefs } = await supabaseAdmin.from('security_notifications_prefs')
      .select('*')
      .eq('user_id', userId)
      .single()

    // 2. Check if they opted out of emails globally
    if (!prefs || !prefs.via_email) return

    // 3. Check if they opted out of this specific event
    const prefField = PREF_MAP[event]
    if (prefs[prefField] === false) return

    // 4. Determine subject and body
    let subject = ''
    let html = ''

    if (event === 'PASSWORD_CHANGE') {
      subject = 'Your COPS password was changed'
      html = `
        <div style="font-family: sans-serif; color: #333;">
          <h2 style="color: #f97316;">Security Alert: Password Changed</h2>
          <p>Hello,</p>
          <p>We're writing to let you know that the password for your COPS account was recently changed.</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString('en-IN')}</p>
          <p>If you made this change, you can safely ignore this email.</p>
          <p style="color: #ef4444; font-weight: bold;">If you did NOT make this change, please contact support immediately and recover your account.</p>
          <br />
          <p>Stay Safe,<br/>COPS Community Policing Team</p>
        </div>
      `
    } else if (event === 'FAILED_LOGIN') {
      subject = 'Failed Login Attempt Detected'
      html = `
        <div style="font-family: sans-serif; color: #333;">
          <h2 style="color: #f97316;">Security Alert: Failed Login</h2>
          <p>Hello,</p>
          <p>We detected a failed login attempt to your COPS account.</p>
          <ul>
            <li><strong>Time:</strong> ${new Date().toLocaleString('en-IN')}</li>
            <li><strong>Method:</strong> Password</li>
            ${data?.ip ? `<li><strong>IP:</strong> ${data.ip}</li>` : ''}
          </ul>
          <p>If this was you forgetting your password, you can safely ignore this email.</p>
          <p>If this wasn't you, someone may be trying to access your account. We recommend enabling Two-Factor Authentication from the Security tab.</p>
          <br />
          <p>Stay Safe,<br/>COPS Community Policing Team</p>
        </div>
      `
    } else if (event === 'NEW_DEVICE') {
      subject = 'New SignIn to Your COPS Account'
      html = `
        <div style="font-family: sans-serif; color: #333;">
          <h2 style="color: #f97316;">Security Alert: New Device Login</h2>
          <p>Hello,</p>
          <p>Your COPS account was signed in from a new device.</p>
          <ul>
            <li><strong>Time:</strong> ${new Date().toLocaleString('en-IN')}</li>
            <li><strong>Device/Browser:</strong> ${data?.browser || 'Unknown'} on ${data?.os || 'Unknown'}</li>
            <li><strong>Location:</strong> ${data?.city || 'Unknown'}, ${data?.region || ''}</li>
          </ul>
          <p>If this was you, you can safely ignore this email.</p>
          <p style="color: #ef4444; font-weight: bold;">If this was NOT you, please log in immediately, change your password, and revoke active sessions.</p>
          <br />
          <p>Stay Safe,<br/>COPS Community Policing Team</p>
        </div>
      `
    } else if (event === 'FIR_STATUS') {
      subject = `COPS Request Update: ${data?.firNumber || ''}`
      html = `
        <div style="font-family: sans-serif; color: #333;">
          <h2 style="color: #f97316;">Report Status Updated</h2>
          <p>Hello,</p>
          <p>The status of your report <strong>${data?.firNumber || ''}</strong> has been updated to: <strong>${data?.newStatus}</strong>.</p>
          <p>Please log in to the COPS platform to view the latest officer notes.</p>
          <br />
          <p>Stay Safe,<br/>COPS Community Policing Team</p>
        </div>
      `
    }

    // 5. Send Email
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('--- EMAIL INTERCEPTED (SMTP not configured) ---')
      console.log('To:', email)
      console.log('Subject:', subject)
      console.log('HTML (preview):', html.substring(0, 150) + '...')
      return
    }

    const transporter = getTransporter()
    await transporter.sendMail({
      from: `"COPS Platform Security" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html
    })

    console.log('[SECURITY NOTIF] Email sent successfully to', email, 'for event:', event)
  } catch (err) {
    console.error('[SECURITY NOTIF] Failed to send email:', err)
  }
}
