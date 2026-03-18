'use client'

import { useState, useTransition } from 'react'
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { changePassword } from '@/app/citizen/profile/security/actions'

export function ChangePasswordCard() {
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const hasUpper = /[A-Z]/.test(newPass)
  const hasNum = /[0-9]/.test(newPass)
  const hasSpecial = /[^A-Za-z0-9]/.test(newPass)
  const hasLen = newPass.length >= 8
  
  const allReqsMet = hasUpper && hasNum && hasSpecial && hasLen && newPass === confirm && newPass !== current && current !== ''

  const getStrength = () => {
    let score = 0
    if (hasLen) score++
    if (hasUpper) score++
    if (hasNum) score++
    if (hasSpecial) score++
    if (newPass.length >= 12) score++
    return score
  }

  const strength = getStrength()
  const strengthLabels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Strong']
  const strengthColors = ['bg-red-500', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-500']

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!allReqsMet) return
    setError(null)
    setSuccess(null)
    
    startTransition(async () => {
      const formData = new FormData()
      formData.append('currentPassword', current)
      formData.append('newPassword', newPass)
      formData.append('confirmPassword', confirm)
      
      const res = await changePassword(formData)
      if (res.error) {
        setError(res.error)
      } else {
        setSuccess(res.message || 'Password updated')
        setCurrent('')
        setNewPass('')
        setConfirm('')
      }
    })
  }

  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-6">
      <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
        <Lock className="w-5 h-5 text-orange-400" /> Change Password
      </h2>
      <p className="text-xs text-gray-500 mb-6">Last changed: Unknown</p>

      <form onSubmit={handleSubmit} className="max-w-md space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Current Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type={show ? 'text' : 'password'} value={current} onChange={e => setCurrent(e.target.value)}
              className="w-full bg-[#1A2235] border border-[#1F2D42] rounded-lg pl-10 pr-10 py-3 text-sm text-[#F1F5F9] placeholder:text-gray-600 outline-none focus:border-orange-500/50 transition-colors"
              placeholder="Enter current password"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type={show ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)}
              className="w-full bg-[#1A2235] border border-[#1F2D42] rounded-lg pl-10 pr-10 py-3 text-sm text-[#F1F5F9] placeholder:text-gray-600 outline-none focus:border-orange-500/50 transition-colors"
              placeholder="Min 8 characters"
            />
            <button type="button" onClick={() => setShow(!show)} aria-label="Show/hide password"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {newPass && (
            <div className="mt-3">
              <div className="flex gap-1 h-1.5 mb-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`flex-1 rounded-full ${i < strength ? strengthColors[strength] : 'bg-[#1F2D42]'}`} />
                ))}
              </div>
              <p className={`text-xs ${strength < 2 ? 'text-red-400' : strength < 4 ? 'text-yellow-400' : 'text-green-400'} font-medium`}>
                {strengthLabels[strength]}
              </p>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">{hasLen ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <span className="w-3.5 h-3.5 text-gray-600">❌</span>} At least 8 chars</div>
            <div className="flex items-center gap-1.5">{hasUpper ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <span className="w-3.5 h-3.5 text-gray-600">❌</span>} One uppercase</div>
            <div className="flex items-center gap-1.5">{hasNum ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <span className="w-3.5 h-3.5 text-gray-600">❌</span>} One number</div>
            <div className="flex items-center gap-1.5">{hasSpecial ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <span className="w-3.5 h-3.5 text-gray-600">❌</span>} One special char</div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
              className="w-full bg-[#1A2235] border border-[#1F2D42] rounded-lg pl-10 pr-10 py-3 text-sm text-[#F1F5F9] placeholder:text-gray-600 outline-none focus:border-orange-500/50 transition-colors"
              placeholder="Re-enter new password"
            />
            {confirm && confirm === newPass && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 flex items-center gap-2" role="alert">
            <AlertTriangle className="w-4 h-4" /> {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-400 flex items-center gap-2" role="status">
            <CheckCircle className="w-4 h-4" /> {success}
          </p>
        )}

        <button type="submit" disabled={!allReqsMet || isPending}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          {isPending ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
