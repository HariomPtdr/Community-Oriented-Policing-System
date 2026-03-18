'use client'

import { useState, useTransition } from 'react'
import { Bell, Mail, Smartphone, AlertTriangle, Shield, Check, Loader2 } from 'lucide-react'
import { updateSecurityNotifPrefs } from '@/app/citizen/profile/security/actions'

export function SecurityNotificationsCard({ prefs }: { prefs: any }) {
  const [data, setData] = useState({
    notifyNewDeviceLogin: prefs.notify_new_device_login ?? true,
    notifyPasswordChange: prefs.notify_password_change ?? true,
    notifyFirStatusChange: prefs.notify_fir_status_change ?? true,
    notifyNewDeviceLinked: prefs.notify_new_device_linked ?? true,
    notifyFailedLogins: prefs.notify_failed_logins ?? true,
    notifyAccountAccessed: prefs.notify_account_accessed ?? false,
    
    viaEmail: true,
    viaSms: prefs.via_sms ?? true,
    viaPush: prefs.via_push ?? false,
  })

  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState<string | null>(null)
  const [toast, setToast] = useState<{msg: string, type: 'warn'|'info'} | null>(null)

  const handleChange = (key: keyof typeof data, value: boolean) => {
    const newData = { ...data, [key]: value }
    setData(newData)
    setSaved(null)
    setToast(null)

    // Warn if turning off password change notifs
    if (key === 'notifyPasswordChange' && !value) {
      setToast({ msg: 'Warning: Disabling password change alerts is highly discouraged.', type: 'warn' })
    }
    

    startTransition(async () => {
      const formData = new FormData()
      Object.entries(newData).forEach(([k, v]) => formData.append(k, String(v)))
      
      const res = await updateSecurityNotifPrefs(formData)
      if (!res.error) {
        setSaved(key as string)
        setTimeout(() => setSaved(null), 2000)
      }
    })
  }

  const events = [
    { key: 'notifyNewDeviceLogin', label: 'New device login', desc: 'When someone logs in from a new device' },
    { key: 'notifyPasswordChange', label: 'Password change', desc: 'When your password is changed' },
    { key: 'notifyFailedLogins', label: 'Failed logins', desc: 'After multiple incorrect password attempts' },
    { key: 'notifyFirStatusChange', label: 'FIR status change', desc: 'When an FIR status is updated (Non-security)' },
  ] as const



  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-6">
      <h2 className="text-base font-semibold text-white mb-6 flex items-center gap-2">
        <Bell className="w-5 h-5 text-orange-400" /> Security Notifications
      </h2>

      {toast && (
        <div className={`p-3 mb-6 rounded-lg text-xs flex items-center gap-2 ${toast.type === 'warn' ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400' : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'}`}>
          <AlertTriangle className="w-4 h-4" /> {toast.msg}
        </div>
      )}

      <div className="space-y-6">
        {/* Events list */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Notify me about:</h3>
          <div className="space-y-3">
            {events.map(ev => (
              <div key={ev.key} className="flex justify-between items-center bg-[#0B0F1A] border border-[#1F2D42] p-3 rounded-xl">
                <div>
                  <p className="text-sm text-gray-200">{ev.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{ev.desc}</p>
                </div>
                <div className="flex items-center gap-3">
                  {saved === ev.key && <Check className="w-4 h-4 text-green-400 animate-in fade-in" />}
                  <button
                    onClick={() => handleChange(ev.key, !data[ev.key])}
                    disabled={isPending}
                    className={`w-9 h-5 rounded-full transition-colors relative ${data[ev.key] ? 'bg-orange-500' : 'bg-gray-700'}`}
                  >
                    <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform shadow-sm ${data[ev.key] ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
