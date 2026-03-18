'use client'

import { useState, useTransition } from 'react'
import { Download, Trash2, Shield, FileText, AlertTriangle, Loader2, CheckCircle, Clock } from 'lucide-react'
import { requestDataExport, requestAccountDeletion, cancelAccountDeletion } from '@/app/citizen/profile/security/actions'

export function DataPrivacyCard({ dataExport, pendingDeletion }: { dataExport: any, pendingDeletion: any }) {
  const [isExportPending, startExportTransition] = useTransition()
  const [exportError, setExportError] = useState<string | null>(null)
  
  const [isDeletePending, startDeleteTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showDeleteForm, setShowDeleteForm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [blockedFirs, setBlockedFirs] = useState<string[]>([])
  const [blockedReason, setBlockedReason] = useState<string | null>(null)

  const handleExport = () => {
    setExportError(null)
    startExportTransition(async () => {
      const res = await requestDataExport()
      if (res.error) setExportError(res.error)
    })
  }

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault()
    setDeleteError(null)
    setBlockedReason(null)
    setBlockedFirs([])
    
    startDeleteTransition(async () => {
      const formData = new FormData()
      formData.append('confirmationText', confirmText)
      formData.append('password', deletePassword)
      formData.append('reason', deleteReason)
      
      const res = await requestAccountDeletion(formData)
      if (res.error) {
        setDeleteError(res.error)
      } else if (res.blocked) {
        setBlockedReason(res.reason)
        setBlockedFirs(res.openFirs)
        setShowDeleteForm(false)
      } else {
        setShowDeleteForm(false)
      }
    })
  }

  const handleCancelDelete = () => {
    startDeleteTransition(async () => {
      await cancelAccountDeletion()
    })
  }

  return (
    <div className="space-y-6">
      {/* Export Card */}
      <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-6">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-400" /> Download My Data
        </h2>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            <p className="mb-2 text-white font-medium">What's included:</p>
            <ul className="list-disc list-inside space-y-1 mb-4 text-xs">
              <li>Complete Profile & Officer Details</li>
              <li>Filed Reports, Case Logs & Evidence Metadata</li>
              <li>Citizen-Officer Chats & Private Messages</li>
              <li>Forum Activity, Posts & Notifications</li>
              <li>SOS Emergency History & Resolutions</li>
              <li>Full Activity Logs & Security Sessions</li>
            </ul>
            <p className="text-xs italic"><span className="text-yellow-500 font-semibold">Note:</span> FIR documents are not included due to legal hold requirements.</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#1A2235] border border-[#1F2D42] rounded-xl">
            <div>
              <p className="text-sm font-semibold text-white">Data Export Request</p>
              {dataExport.lastRequest ? (
                <div className="text-xs text-gray-400 mt-1">
                  Last request: <Clock className="inline w-3 h-3 mb-0.5" /> {new Date(dataExport.lastRequest.requestedAt).toLocaleString()}
                  {dataExport.lastRequest.status === 'ready' && (
                    <span className="ml-2 text-green-400 inline-flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Ready
                      {dataExport.lastRequest.downloadUrl && (
                        <a 
                          href={dataExport.lastRequest.downloadUrl} 
                          className="text-blue-400 underline ml-2" 
                          download={`cops_export_${new Date(dataExport.lastRequest.requestedAt).toISOString().split('T')[0]}.csv`}
                        >
                          [Download CSV]
                        </a>
                      )}
                    </span>
                  )}
                  {dataExport.lastRequest.status === 'pending' && <span className="ml-2 text-yellow-500 animate-pulse">Processing... (~2 min)</span>}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1">Never requested</p>
              )}
            </div>
            
            <button
              onClick={handleExport}
              disabled={isExportPending || !dataExport.canRequest || dataExport.lastRequest?.status === 'pending'}
              className="bg-[#1F2D42] hover:bg-[#2a3a52] disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {isExportPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Request Export
            </button>
          </div>
          {exportError && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{exportError}</p>}
        </div>
      </div>

      {/* Delete Card */}
      <div className="bg-[#111827] border border-red-900/40 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[50px] -mr-10 -mt-10 rounded-full mix-blend-screen pointer-events-none" />
        
        <h2 className="text-base font-semibold text-red-400 mb-4 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-500" /> Delete Account
        </h2>

        {pendingDeletion.exists ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl mb-4">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" /> Deletion Scheduled
            </h3>
            <p className="text-xs mb-4">
              Your account is scheduled for deletion on <strong>{new Date(pendingDeletion.scheduledFor).toLocaleString()}</strong>.
              You can cancel this request at any time before then.
            </p>
            <button
              onClick={handleCancelDelete} disabled={isDeletePending}
              className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {isDeletePending && <Loader2 className="w-3 h-3 animate-spin" />} Cancel Deletion Request
            </button>
          </div>
        ) : blockedReason ? (
          <div className="p-4 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl flex items-start gap-3">
            <Shield className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm mb-1">Account deletion blocked</h3>
              <p className="text-xs mb-3">{blockedReason}</p>
              {blockedFirs.length > 0 && (
                <div className="text-xs space-y-1 mb-3">
                  {blockedFirs.map(fir => (
                    <div key={fir} className="flex gap-2 items-center bg-black/20 p-1.5 rounded w-fit text-orange-200 font-mono">
                      <FileText className="w-3 h-3" /> {fir}
                    </div>
                  ))}
                </div>
              )}
              <a href="/citizen/reports" className="text-xs font-semibold underline underline-offset-2 hover:text-orange-300">View My Reports →</a>
            </div>
          </div>
        ) : showDeleteForm ? (
          <form onSubmit={handleDelete} className="space-y-4 max-w-lg relative z-10">
            <div className="grid grid-cols-2 gap-4 text-xs p-4 bg-[#0B0F1A] border border-[#1F2D42] rounded-xl">
              <div>
                <p className="font-semibold text-red-400 mb-2">What gets deleted:</p>
                <ul className="list-disc list-inside text-gray-400 space-y-1">
                  <li>Profile & Forum Posts</li>
                  <li>Messages & Notifications</li>
                  <li>All Active Sessions</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-yellow-500 mb-2">What is retained:</p>
                <ul className="list-disc list-inside text-gray-400 space-y-1">
                  <li title="Legal requirement under IT Act">FIRs / Incident Reports</li>
                  <li>Audit Logs (90 days)</li>
                </ul>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Reason for deletion (Optional)</label>
              <textarea
                value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
                className="w-full bg-[#1A2235] border border-[#1F2D42] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-red-500/50 resize-none h-20"
                placeholder="Why are you leaving?"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-red-400 mb-1">Type DELETE MY ACCOUNT to confirm</label>
              <input
                type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
                className="w-full bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-sm text-red-200 uppercase outline-none focus:border-red-500/80 font-mono font-bold tracking-wider"
                placeholder="DELETE MY ACCOUNT"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Re-enter Password</label>
              <input
                type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)}
                className="w-full bg-[#1A2235] border border-[#1F2D42] rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-red-500/50"
              />
            </div>

            {deleteError && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{deleteError}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="submit" disabled={isDeletePending || confirmText !== 'DELETE MY ACCOUNT' || !deletePassword}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {isDeletePending && <Loader2 className="w-4 h-4 animate-spin" />} Request Deletion
              </button>
              <button
                type="button" onClick={() => setShowDeleteForm(false)}
                className="px-6 bg-[#1F2D42] hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-gray-400 flex-1">
              Permanently delete your account and all data. This action is irreversible after the 30-day grace period.
            </p>
            <button
              onClick={() => setShowDeleteForm(true)}
              className="shrink-0 text-sm text-red-400 border border-red-500/30 hover:bg-red-500/10 font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              Request Deletion
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
