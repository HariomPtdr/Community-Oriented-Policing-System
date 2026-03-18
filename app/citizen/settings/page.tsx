'use client'

import { useState, useEffect, useTransition } from 'react'
import { 
  Settings, Bell, Shield, Lock, Trash2, AlertTriangle, 
  ShieldCheck, Smartphone, Check, Save, Loader2, Clock
} from 'lucide-react'
import { 
  getSettingsDataForPage, 
  updateGeneralSettings, 
  updateSecurityNotifPrefs, 
  updatePrivacyControls 
} from '@/app/citizen/profile/security/actions'
import { DataPrivacyCard } from '@/components/profile/security/DataPrivacyCard'

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('notifications')
  const [loading, setLoading] = useState(true)
  const [saving, startSaveTransition] = useTransition()
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data state
  const [data, setData] = useState<any>(null)
  
  // Local state for forms
  const [notifPrefs, setNotifPrefs] = useState<any>({})
  const [privacyControls, setPrivacyControls] = useState<any>({})

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getSettingsDataForPage()
        setData(res)
        setNotifPrefs(res.notifPrefs || {})
        setPrivacyControls(res.privacyControls || {})
      } catch (err) {
        setError('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleSave = () => {
    setError(null)
    setSaveSuccess(false)
    
    startSaveTransition(async () => {
      let res: any
      
      if (activeSection === 'notifications') {
        const formData = new FormData()
        Object.entries(notifPrefs).forEach(([key, val]) => {
          formData.append(key, String(val))
        })
        res = await updateSecurityNotifPrefs(formData)
      } else if (activeSection === 'privacy') {
        const formData = new FormData()
        formData.append('data', JSON.stringify(privacyControls))
        res = await updatePrivacyControls(formData)
      }
      
      if (res?.error) {
        setError(res.error)
      } else {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  const sections = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Data', icon: Shield },
    { id: 'security', label: 'Account Security', icon: Lock },
  ]

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-2">
          <div className="px-4 py-2 border-b border-[#1F2D42] mb-4">
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <p className="text-xs text-gray-500">Manage your COPS experience</p>
          </div>
          
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id)
                setError(null)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === section.id 
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <section.icon className={`w-4 h-4 ${activeSection === section.id ? 'text-orange-400' : 'text-gray-500'}`} />
              <span className="text-sm font-medium">{section.label}</span>
              {activeSection === section.id && <div className="ml-auto w-1 h-4 bg-orange-500 rounded-full" />}
            </button>
          ))}
          
          <div className="pt-8 px-4">
            <button 
              onClick={() => setActiveSection('security')}
              className="flex items-center gap-2 text-xs text-red-500 hover:text-red-400 opacity-60 hover:opacity-100 transition-all font-semibold uppercase tracking-wider"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Account
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          


          {activeSection === 'notifications' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="bg-[#111827] border border-[#1F2D42] rounded-3xl p-6 md:p-8">
                <h2 className="text-lg font-bold text-white mb-2">Notification Center</h2>
                <p className="text-sm text-gray-500 mb-8">Control how you stay updated with community safety.</p>

                <div className="space-y-4">
                  {[
                    { id: 'viaEmail', title: "Email Alerts", desc: "Weekly summaries and formal correspondence" },
                    { id: 'viaSms', title: "SMS Notifications", desc: "Critical alerts (Emergency SOS only)" },
                    { id: 'viaPush', title: "Push Notifications", desc: "Receive immediate updates on your device" },
                    { id: 'notifyFirStatusChange', title: "FIR Status Updates", desc: "Get notified when your case progress changes" },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-[#0D1420] border border-[#1F2D42]/50 rounded-2xl hover:border-gray-700 transition-all">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <button 
                        onClick={() => setNotifPrefs({ ...notifPrefs, [item.id]: !notifPrefs[item.id] })}
                        className={`w-11 h-6 rounded-full transition-all relative ${notifPrefs[item.id] ? 'bg-orange-500' : 'bg-gray-800'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifPrefs[item.id] ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-[#111827] border border-[#1F2D42] rounded-3xl p-6 md:p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Privacy Controls</h2>
                    <p className="text-sm text-gray-500">Manage your data and visibility.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="p-5 bg-white/[0.02] border border-[#1F2D42] rounded-2xl">
                    <h4 className="text-sm font-bold text-white mb-2">Forum Identity</h4>
                    <p className="text-xs text-gray-500 mb-4">Choose how you appear in community forums.</p>
                    <select 
                      value={privacyControls.forumNameVisibility}
                      onChange={(e) => setPrivacyControls({ ...privacyControls, forumNameVisibility: e.target.value })}
                      className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl px-4 py-2.5 text-xs text-white"
                    >
                      <option value="everyone">Real Name (Public)</option>
                      <option value="neighborhood_only">Neighborhood Only</option>
                      <option value="hidden">Completely Anonymous</option>
                    </select>
                  </div>
                  <div className="p-5 bg-white/[0.02] border border-[#1F2D42] rounded-2xl flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white mb-2">Ghost Mode</h4>
                      <p className="text-xs text-gray-500 mb-4">Hide your "last seen" status from others.</p>
                    </div>
                    <button 
                      onClick={() => setPrivacyControls({ ...privacyControls, hideLastSeen: !privacyControls.hideLastSeen })}
                      className={`w-11 h-6 rounded-full transition-all relative ${privacyControls.hideLastSeen ? 'bg-orange-500' : 'bg-gray-800'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${privacyControls.hideLastSeen ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <DataPrivacyCard dataExport={data.dataExport} pendingDeletion={data.pendingDeletion} />
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-[#111827] border border-[#1F2D42] rounded-3xl p-6 md:p-8">
                <h2 className="text-lg font-bold text-white mb-6">Security Dashboard</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-[#0D1420] border border-[#1F2D42] rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <Smartphone className={`w-5 h-5 ${data.twoFactor.isEnabled ? 'text-green-400' : 'text-gray-500'}`} />
                      <h3 className="text-sm font-bold text-white">2-Step Verification</h3>
                    </div>
                    <p className={`text-xs mb-4 ${data.twoFactor.isEnabled ? 'text-green-400/80' : 'text-gray-500'}`}>
                      {data.twoFactor.isEnabled ? 'Enabled via Authenticator App' : 'Additional security is recommended.'}
                    </p>
                    <button className="w-full py-2.5 bg-[#1F2D42] hover:bg-[#2a3a52] text-white text-xs font-bold rounded-lg transition-colors">
                      {data.twoFactor.isEnabled ? 'Manage' : 'Setup Now'}
                    </button>
                  </div>

                  <div className="p-6 bg-[#0D1420] border border-[#1F2D42] rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <Clock className="w-5 h-5 text-blue-400" />
                      <h3 className="text-sm font-bold text-white">Active Sessions</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">
                      {data.activeSessions.length} active device sessions found.
                    </p>
                    <button className="w-full py-2.5 bg-[#1F2D42] hover:bg-[#2a3a52] text-white text-xs font-bold rounded-lg transition-colors">
                      Review Sessions
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Save Bar */}
          {activeSection !== 'security' && (
            <div className="mt-8 pt-6 border-t border-[#1F2D42] flex items-center justify-between">
              <div className="flex items-center gap-3">
                {saveSuccess && (
                  <div className="flex items-center gap-2 text-green-400 animate-in fade-in slide-in-from-left-2 transition-all">
                    <Check className="w-4 h-4" />
                    <span className="text-xs font-semibold">Changes saved to database</span>
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 text-red-500 animate-in fade-in slide-in-from-left-2 transition-all">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-semibold">{error}</span>
                  </div>
                )}
              </div>
              
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-bold px-8 py-3 rounded-xl transition-all shadow-xl shadow-orange-500/20 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

