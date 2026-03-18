'use client'

import { useEffect, useState } from 'react'
import { getSecurityDashboardData } from '@/app/citizen/profile/security/actions'
import { ChangePasswordCard } from './ChangePasswordCard'
import { SecurityNotificationsCard } from './SecurityNotificationsCard'
import { DataPrivacyCard } from './DataPrivacyCard'
import { Loader2 } from 'lucide-react'

export function SecurityShell() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getSecurityDashboardData()
        setData(res)
      } catch (err: any) {
        setError(err.message || 'Failed to load security dashboard')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-[#111827] border border-[#1F2D42] rounded-2xl">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
        <p className="text-gray-400 font-medium">Loading security settings...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl">
        <h3 className="font-bold">Error</h3>
        <p className="text-sm mt-1">{error || 'Unknown error occurred'}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 2-Column Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChangePasswordCard />
        <SecurityNotificationsCard prefs={data.notifPrefs} />
      </div>

      {/* Danger Zone / Data Privacy */}
      <div className="pt-6 border-t border-[#1F2D42]/50 mt-6 relative z-0">
        <DataPrivacyCard dataExport={data.dataExport} pendingDeletion={data.pendingDeletion} />
      </div>
    </div>
  )
}
