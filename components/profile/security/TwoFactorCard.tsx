'use client'

import { useState, useTransition } from 'react'
import { ShieldAlert, ShieldCheck, Smartphone, Key, X, Copy, Download, Loader2, AlertTriangle, CheckCircle } from 'lucide-react'
import { initiateTotpSetup, verifyAndEnableTotp, disableTwoFactor } from '@/app/citizen/profile/security/actions'
import { QRCodeSVG } from 'qrcode.react'

export function TwoFactorCard({ initialData }: { initialData: any }) {
  const [data, setData] = useState(initialData)
  const [step, setStep] = useState(data.isEnabled ? 'enabled' : 'disabled')
  
  // Setup state
  const [secret, setSecret] = useState('')
  const [qrUri, setQrUri] = useState('')
  const [token, setToken] = useState('')
  
  // Backup codes
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [savedCodes, setSavedCodes] = useState(false)

  // Disable state
  const [disablePassword, setDisablePassword] = useState('')
  const [disableToken, setDisableToken] = useState('')
  
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleStartSetup = () => {
    setError(null)
    startTransition(async () => {
      const res = await initiateTotpSetup()
      if (res.error) {
        setError(res.error)
      } else {
        setSecret(res.secret!)
        setQrUri(res.qrCodeUri!)
        setStep('setup')
      }
    })
  }

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.append('token', token)
      const res = await verifyAndEnableTotp(formData)
      if (res.error) {
        setError(res.error)
      } else {
        setBackupCodes(res.backupCodes!)
        setShowBackupModal(true)
        setStep('enabled')
        setData({ ...data, isEnabled: true, method: 'totp', backupCodesRemaining: 8 })
      }
    })
  }

  const handleDisable = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.append('currentPassword', disablePassword)
      if (data.method === 'totp') {
        formData.append('totpToken', disableToken)
      }
      const res = await disableTwoFactor(formData)
      if (res.error) {
        setError(res.error)
      } else {
        setStep('disabled')
        setData({ ...data, isEnabled: false, method: 'disabled' })
      }
    })
  }

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
  }

  const handleDownloadCodes = () => {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cops-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          {data.isEnabled ? <ShieldCheck className="w-5 h-5 text-green-400" /> : <ShieldAlert className="w-5 h-5 text-red-400" />}
          Two-Factor Authentication
        </h2>
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${data.isEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {data.isEnabled ? 'Enabled' : 'Not Enabled'}
        </span>
      </div>

      {step === 'disabled' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Add an extra layer of security to your account by requiring more than just your password to sign in.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleStartSetup}
              disabled={isPending}
              className="flex items-start text-left gap-3 p-4 bg-[#1A2235] border border-[#1F2D42] rounded-xl hover:border-orange-500/50 transition-colors group"
            >
              <Key className="w-5 h-5 text-orange-400 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors">Authenticator App</h3>
                <p className="text-xs text-gray-400 mt-1">Google Authenticator, Authy, etc.</p>
              </div>
            </button>
            <button
              disabled
              className="flex items-start text-left gap-3 p-4 bg-[#1A2235] border border-[#1F2D42] rounded-xl opacity-50 cursor-not-allowed"
            >
              <Smartphone className="w-5 h-5 text-gray-400 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-white">SMS OTP</h3>
                <p className="text-xs text-gray-400 mt-1">Coming soon for your region</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {step === 'setup' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Setup Authenticator App</h3>
            <button onClick={() => setStep('disabled')} className="text-xs text-gray-400 hover:text-white">Cancel</button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="bg-white p-3 rounded-xl shrink-0">
              {qrUri && <QRCodeSVG value={qrUri} size={150} />}
            </div>
            
            <div className="space-y-4 flex-1">
              <p className="text-sm text-gray-300">1. Open your authenticator app (Google Authenticator, Authy) and scan this QR code.</p>
              <div className="space-y-2">
                <p className="text-xs text-gray-400">Or enter this setup key manually:</p>
                <code className="block bg-[#1A2235] border border-[#1F2D42] rounded p-2 text-xs font-mono text-orange-400 break-all select-all">
                  {secret}
                </code>
              </div>
            </div>
          </div>

          <form onSubmit={handleVerify} className="max-w-xs space-y-4 pt-4 border-t border-[#1F2D42]">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">2. Enter 6-digit code</label>
              <input
                type="text" maxLength={6} value={token} onChange={e => setToken(e.target.value)}
                className="w-full bg-[#1A2235] border border-[#1F2D42] rounded-lg px-4 py-3 text-sm text-[#F1F5F9] placeholder:text-gray-600 outline-none focus:border-orange-500/50 text-center tracking-[0.5em] font-mono font-bold"
                placeholder="000000"
              />
            </div>
            {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{error}</p>}
            <button type="submit" disabled={isPending || token.length !== 6}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Verify & Enable
            </button>
          </form>
        </div>
      )}

      {step === 'enabled' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-300">Your account is secured with <strong>{data.method === 'totp' ? 'Authenticator App' : 'SMS'}</strong>.</p>
          <div className="flex gap-4">
            <div className="p-3 bg-[#1A2235] border border-[#1F2D42] rounded-lg">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Backup Codes</p>
              <p className="text-lg font-bold text-white">{data.backupCodesRemaining} <span className="text-xs font-normal text-gray-500">remaining</span></p>
            </div>
          </div>
          <div className="pt-4 border-t border-[#1F2D42]">
            <button onClick={() => setStep('disable')} className="text-sm text-red-400 hover:text-red-300 font-semibold px-4 py-2 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors">
              Disable 2FA
            </button>
          </div>
        </div>
      )}

      {step === 'disable' && (
        <form onSubmit={handleDisable} className="space-y-4 max-w-sm">
          <h3 className="text-sm font-semibold text-white">Disable Two-Factor Authentication</h3>
          <p className="text-xs text-gray-400">Please verify your identity to disable 2FA.</p>
          
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Current Password</label>
            <input
              type="password" value={disablePassword} onChange={e => setDisablePassword(e.target.value)}
              className="w-full bg-[#1A2235] border border-[#1F2D42] rounded-lg px-4 py-2 text-sm text-[#F1F5F9] outline-none focus:border-orange-500/50"
            />
          </div>
          
          {data.method === 'totp' && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Authenticator Code</label>
              <input
                type="text" maxLength={6} value={disableToken} onChange={e => setDisableToken(e.target.value)}
                className="w-full bg-[#1A2235] border border-[#1F2D42] rounded-lg px-4 py-2 text-sm text-[#F1F5F9] outline-none focus:border-orange-500/50 tracking-widest font-mono"
              />
            </div>
          )}

          {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />} Confirm Disable
            </button>
            <button type="button" onClick={() => setStep('enabled')} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          </div>
        </form>
      )}

      {/* Backup Codes Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl w-full max-w-md overflow-hidden relative">
            <div className="p-6 border-b border-[#1F2D42] bg-[#1A2235]/50 px-6">
              <h3 className="text-lg font-bold text-white">Save Backup Codes</h3>
              <p className="text-sm text-orange-400 mt-1 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                Save these codes somewhere safe. You will not see them again.
              </p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 mb-6 bg-[#0B0F1A] p-4 rounded-xl border border-[#1F2D42]">
                {backupCodes.map((code, i) => (
                  <code key={i} className="text-sm font-mono text-center text-gray-300 font-bold tracking-wider">{code}</code>
                ))}
              </div>
              
              <div className="flex gap-3 mb-6">
                <button onClick={handleCopyCodes} className="flex-1 bg-[#1A2235] hover:bg-[#1F2D42] border border-[#2a3a52] text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
                  <Copy className="w-4 h-4" /> Copy
                </button>
                <button onClick={handleDownloadCodes} className="flex-1 bg-[#1A2235] hover:bg-[#1F2D42] border border-[#2a3a52] text-white text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>

              <label className="flex items-center gap-2 mb-6 cursor-pointer group">
                <input type="checkbox" checked={savedCodes} onChange={e => setSavedCodes(e.target.checked)} className="w-4 h-4 rounded bg-[#1A2235] border-[#1F2D42] text-orange-500 focus:ring-orange-500/50" />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">I have securely saved these backup codes</span>
              </label>

              <button
                onClick={() => setShowBackupModal(false)}
                disabled={!savedCodes}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Close and Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
