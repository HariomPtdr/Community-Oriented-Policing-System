'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getMyLostFoundItems, markFoundBySelf, archiveItem, renewListing } from '../actions'
import { LF_CATEGORIES, type LFItem } from '@/lib/validations/lost-found'
import {
  ArrowLeft, Package, Eye, MapPin, Calendar,
  Archive, CheckCircle2, RefreshCw, Edit, Award,
  ChevronRight, Clock, AlertTriangle, Sparkles, Filter
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: string }> = {
  active:    { label: 'Active',    class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '🟢' },
  matched:   { label: 'Matched',   class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',   icon: '⚡' },
  claimed:   { label: 'Claimed',   class: 'bg-blue-500/20 text-blue-400 border-blue-500/30',         icon: '📋' },
  reunited:  { label: 'Reunited',  class: 'bg-green-500/20 text-green-400 border-green-500/30',      icon: '✅' },
  in_custody:{ label: 'In Custody',class: 'bg-purple-500/20 text-purple-400 border-purple-500/30',   icon: '🏛' },
  expired:   { label: 'Expired',   class: 'bg-red-500/20 text-red-400 border-red-500/30',            icon: '⏰' },
  archived:  { label: 'Archived',  class: 'bg-gray-500/20 text-gray-400 border-gray-500/30',         icon: '📁' },
  removed:   { label: 'Removed',   class: 'bg-red-500/20 text-red-400 border-red-500/30',            icon: '🚫' },
}

export default function MyItemsPage() {
  const [items, setItems] = useState<LFItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all')
  const [actionMsg, setActionMsg] = useState('')
  const [actionItemId, setActionItemId] = useState<string | null>(null)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    setLoading(true)
    const data = await getMyLostFoundItems()
    setItems(data)
    setLoading(false)
  }

  const filtered = items.filter(item => {
    if (filter === 'active') return ['active', 'matched', 'claimed'].includes(item.status)
    if (filter === 'resolved') return ['reunited', 'archived', 'expired'].includes(item.status)
    return true
  })

  const handleAction = async (action: string, itemId: string) => {
    setActionItemId(itemId)
    setActionMsg('')
    try {
      let res: any
      if (action === 'found') res = await markFoundBySelf(itemId)
      else if (action === 'archive') res = await archiveItem(itemId)
      else if (action === 'renew') res = await renewListing(itemId)

      if (res?.success) {
        setActionMsg('✅ Updated successfully!')
        loadItems()
      } else {
        setActionMsg(res?.error || 'Action failed.')
      }
    } catch {
      setActionMsg('Unexpected error.')
    }
    setTimeout(() => { setActionMsg(''); setActionItemId(null) }, 3000)
  }

  const activeCount = items.filter(i => ['active', 'matched', 'claimed'].includes(i.status)).length
  const resolvedCount = items.filter(i => ['reunited'].includes(i.status)).length
  const expiredCount = items.filter(i => i.status === 'expired').length

  return (
    <div className="pb-20">
      <Link href="/citizen/lost-found"
        className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Back to Lost & Found
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">My Items</h1>
          <p className="text-gray-500 text-sm">{items.length} total items reported by you</p>
        </div>
        <Link href="/citizen/lost-found/report"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-bold px-5 py-3 rounded-2xl transition-all shadow-lg shadow-orange-500/20 text-sm"
        >
          + New Report
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-4 text-center">
          <p className="text-xl font-black text-emerald-400 font-mono">{activeCount}</p>
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Active</p>
        </div>
        <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-4 text-center">
          <p className="text-xl font-black text-green-400 font-mono">{resolvedCount}</p>
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Reunited</p>
        </div>
        <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-4 text-center">
          <p className="text-xl font-black text-red-400 font-mono">{expiredCount}</p>
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Expired</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex bg-[#111827] border border-[#1F2D42] rounded-2xl p-1 mb-6 w-fit">
        {(['all', 'active', 'resolved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              filter === f ? 'bg-orange-500 text-black' : 'text-gray-500 hover:text-white'
            }`}
          >
            {f === 'all' ? `All (${items.length})` : f === 'active' ? `Active (${activeCount})` : `Resolved (${resolvedCount})`}
          </button>
        ))}
      </div>

      {/* Items list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#111827] border border-[#1F2D42] rounded-2xl h-40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#111827] border border-dashed border-[#1F2D42] rounded-3xl p-12 text-center">
          <Package className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No items here</h3>
          <p className="text-gray-500 text-sm mb-6">
            {filter === 'all' ? "You haven't reported any items yet." :
             filter === 'active' ? "No active reports." : "No resolved items yet."}
          </p>
          <Link href="/citizen/lost-found/report"
            className="bg-orange-500 text-black font-bold px-6 py-3 rounded-xl text-sm hover:bg-orange-400 transition-colors"
          >
            Report an Item
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(item => {
            const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.active
            const cat = LF_CATEGORIES.find(c => c.value === item.category)
            const daysToExpiry = item.expires_at
              ? Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null

            return (
              <div key={item.id} className="bg-[#111827] border border-[#1F2D42] rounded-2xl overflow-hidden hover:border-[#2a3a52] transition-all">
                <div className="flex flex-col md:flex-row">
                  {/* Thumb */}
                  <div className="w-full md:w-40 h-32 md:h-auto bg-[#0D1420] shrink-0 relative">
                    {item.photo_url ? (
                      <img src={item.photo_url} alt={item.item_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl">{cat?.icon || '📦'}</span>
                      </div>
                    )}
                    <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                      item.report_type === 'lost' ? 'bg-orange-500 text-white' : 'bg-green-500 text-black'
                    }`}>
                      {item.report_type}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${status.class}`}>
                            {status.icon} {status.label}
                          </span>
                          <span className="text-[10px] text-gray-600 font-mono">ID: {item.id.slice(0, 8)}</span>
                        </div>
                        <h3 className="text-lg font-black text-white">{item.item_name}</h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-gray-500 mb-3">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.location_text}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(item.incident_date), 'MMM dd, yyyy')}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {item.view_count} views</span>
                      {item.claim_count > 0 && (
                        <span className="flex items-center gap-1 text-blue-400">
                          <AlertTriangle className="w-3 h-3" /> {item.claim_count} claim{item.claim_count > 1 ? 's' : ''}
                        </span>
                      )}
                      {item.has_reward && item.reward_amount && (
                        <span className="flex items-center gap-1 text-yellow-400">
                          <Award className="w-3 h-3" /> ₹{item.reward_amount}
                        </span>
                      )}
                    </div>

                    {/* Expiry warning */}
                    {daysToExpiry !== null && daysToExpiry <= 7 && daysToExpiry > 0 && item.status === 'active' && (
                      <div className="mb-3 p-2.5 bg-yellow-500/5 border border-yellow-500/10 rounded-xl flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 text-[10px] font-bold">Expires in {daysToExpiry} days — Renew to keep active</span>
                      </div>
                    )}

                    {/* Action message for this item */}
                    {actionItemId === item.id && actionMsg && (
                      <div className={`mb-3 p-2.5 rounded-xl text-[10px] font-bold text-center ${
                        actionMsg.startsWith('✅') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {actionMsg}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      {['active', 'matched', 'claimed'].includes(item.status) && (
                        <>
                          <button onClick={() => handleAction('found', item.id)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-bold hover:bg-emerald-500/20 transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> I Found It
                          </button>
                          <button onClick={() => handleAction('archive', item.id)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-xl text-[10px] font-bold hover:bg-gray-500/20 transition-all"
                          >
                            <Archive className="w-3.5 h-3.5" /> Archive
                          </button>
                          <Link href={`/citizen/lost-found/report?edit=${item.id}`}
                            className="flex items-center gap-1.5 px-3 py-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl text-[10px] font-bold hover:bg-orange-500/20 transition-all"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </Link>
                        </>
                      )}
                      {item.status === 'expired' && (item.renewal_count || 0) < 3 && (
                        <button onClick={() => handleAction('renew', item.id)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-xl text-[10px] font-bold hover:bg-yellow-500/20 transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Renew ({3 - (item.renewal_count || 0)} left)
                        </button>
                      )}
                      <Link href={`/citizen/lost-found`}
                        className="flex items-center gap-1.5 px-3 py-2 text-gray-500 text-[10px] font-bold hover:text-white transition-all ml-auto"
                      >
                        View <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
