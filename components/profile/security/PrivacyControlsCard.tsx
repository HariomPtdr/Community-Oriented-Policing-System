'use client'

import { useState, useTransition } from 'react'
import { Settings, Check, Loader2, AlertTriangle, Info } from 'lucide-react'
import { updatePrivacyControls } from '@/app/citizen/profile/security/actions'

export function PrivacyControlsCard({ controls }: { controls: any }) {
  const [data, setData] = useState({
    forumNameVisibility: controls.forum_name_visibility || 'neighborhood_only',
    allowOfficerProfileView: controls.allow_officer_profile_view ?? true,
    anonymousByDefault: controls.anonymous_by_default ?? false,
    hideLastSeen: controls.hide_last_seen ?? false
  })
  
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<any>(null)

  const handleChange = (key: keyof typeof data, value: any) => {
    const newData = { ...data, [key]: value }
    setData(newData)
    setError(null)
    setSaved(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.append('data', JSON.stringify({
        ...newData,
        // Match the zod schema variable names where needed
        forumNameVisibility: newData.forumNameVisibility,
        allowOfficerProfileView: newData.allowOfficerProfileView,
        anonymousByDefault: newData.anonymousByDefault,
        hideLastSeen: newData.hideLastSeen,
      }))
      
      const res = await updatePrivacyControls(formData)
      if (res?.error) {
        setError(res) // Pass the whole object to show fir issues
        // Revert UI change
        setData(data)
      } else {
        setSaved(key as string)
        setTimeout(() => setSaved(null), 2000)
      }
    })
  }

  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-6">
      <h2 className="text-base font-semibold text-white mb-6 flex items-center gap-2">
        <Settings className="w-5 h-5 text-gray-400" /> Privacy Controls
      </h2>

      <div className="space-y-6">
        
        {/* Officer Access Toggle */}
        <div className="pb-6 border-b border-[#1F2D42]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-white font-medium">Allow beat officer to view my profile</p>
              <p className="text-xs text-gray-400">Required if you have active filed reports (FIRs).</p>
            </div>
            <button
              onClick={() => handleChange('allowOfficerProfileView', !data.allowOfficerProfileView)}
              disabled={isPending}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${data.allowOfficerProfileView ? 'bg-orange-500' : 'bg-gray-700'} ${isPending ? 'opacity-50' : ''}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-md ${data.allowOfficerProfileView ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </button>
            {saved === 'allowOfficerProfileView' && <Check className="w-4 h-4 text-green-400 ml-2 animate-in fade-in" />}
          </div>
          
          {error?.activeFirCount > 0 && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Officer profile access is required while you have <strong>{error.activeFirCount} active FIRs</strong>. Please resolve them first.</p>
            </div>
          )}
        </div>

        {/* Forum Visibility */}
        <div className="pb-6 border-b border-[#1F2D42]">
          <p className="text-sm text-white font-medium mb-1">Forum Name Visibility</p>
          <p className="text-xs text-gray-400 mb-3">Who can see your real name on public forum posts</p>
          
          <div className="space-y-2">
            {[
              { val: 'everyone', label: 'Everyone on Platform' },
              { val: 'neighborhood_only', label: 'My Neighborhood Only' },
              { val: 'hidden', label: 'Hidden (Always Anonymous)' }
            ].map(opt => (
              <label key={opt.val} className="flex items-center gap-3 p-3 bg-[#0B0F1A] border border-[#1F2D42] rounded-lg cursor-pointer hover:border-orange-500/50 transition-colors">
                <input
                  type="radio" name="forumVis" 
                  checked={data.forumNameVisibility === opt.val}
                  onChange={() => handleChange('forumNameVisibility', opt.val)}
                  disabled={isPending}
                  className="w-4 h-4 text-orange-500 bg-[#1A2235] border-[#1F2D42] focus:ring-orange-500/50"
                />
                <span className="text-sm text-gray-300 font-medium">{opt.label}</span>
                {saved === 'forumNameVisibility' && data.forumNameVisibility === opt.val && <Check className="w-4 h-4 text-green-400 ml-auto animate-in fade-in" />}
              </label>
            ))}
          </div>
        </div>

        {/* Anonymous Posting by Default */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-white font-medium">Post anonymously by default</p>
              <p className="text-xs text-gray-400">Can be toggled per-post. Only affects future posts.</p>
            </div>
            <button
              onClick={() => handleChange('anonymousByDefault', !data.anonymousByDefault)}
              disabled={isPending}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${data.anonymousByDefault ? 'bg-orange-500' : 'bg-gray-700'} ${isPending ? 'opacity-50' : ''}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-md ${data.anonymousByDefault ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </button>
            {saved === 'anonymousByDefault' && <Check className="w-4 h-4 text-green-400 ml-2 animate-in fade-in" />}
          </div>
        </div>

      </div>
    </div>
  )
}
