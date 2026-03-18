'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getLostFoundItems } from './actions'
import { LF_CATEGORIES, type LFItem, type ListFilters } from '@/lib/validations/lost-found'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Plus, MapPin, Calendar, Clock,
  Filter, ChevronRight, Package, Eye,
  ImageIcon, X, RefreshCw, ChevronLeft,
  Shield, AlertCircle, ChevronDown, Phone, Mail,
  Award, Sparkles, User, ExternalLink
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

// ── Status badge config ────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; class: string; icon?: string }> = {
  active:   { label: 'ACTIVE',   class: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: '🔴' },
  matched:  { label: 'MATCHED',  class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: '⚡' },
  claimed:  { label: 'CLAIMED',  class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  reunited: { label: 'REUNITED', class: 'bg-green-500/20 text-green-400 border-green-500/30', icon: '✅' },
  expired:  { label: 'EXPIRED',  class: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  archived: { label: 'ARCHIVED', class: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
}

const CATEGORY_ICONS: Record<string, string> = Object.fromEntries(
  LF_CATEGORIES.map(c => [c.value, c.icon])
)

// ── Date ranges ────────────────────────────────────────────

const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
] as const

export default function LostFoundPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [items, setItems] = useState<LFItem[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [typeFilter, setTypeFilter] = useState<'all' | 'lost' | 'found'>(
    (searchParams.get('type') as any) || 'all'
  )
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'matched' | 'reunited'>('all')

  // Detail modal
  const [selectedItem, setSelectedItem] = useState<LFItem | null>(null)
  const [showContactInfo, setShowContactInfo] = useState(false)

  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null)
    })
  }, [])

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getLostFoundItems({
        search: search || undefined,
        type: typeFilter,
        category: categoryFilter as any,
        dateRange: dateRangeFilter,
        status: statusFilter,
        page: currentPage,
        pageSize: 18,
      })
      setItems(result.items || [])
      setTotalCount(result.totalCount || 0)
      setTotalPages(result.totalPages || 0)
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, categoryFilter, dateRangeFilter, statusFilter, currentPage])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const handleSearch = () => {
    setCurrentPage(1)
    loadItems()
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-1 tracking-tight">
            Lost & Found
          </h1>
          <p className="text-gray-500 text-sm">
            Police-backed community item recovery • {totalCount} active listings
          </p>
        </div>
        <Link
          href="/citizen/lost-found/report"
          className="flex items-center gap-2.5 bg-orange-500 hover:bg-orange-400 text-black font-black px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-orange-500/20 text-sm uppercase tracking-widest"
        >
          <Plus className="w-5 h-5" />
          Report Lost / Found
        </Link>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-orange-400 font-mono">
            {items.filter(i => i.report_type === 'lost').length || '—'}
          </p>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Items Lost</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-green-400 font-mono">
            {items.filter(i => i.report_type === 'found').length || '—'}
          </p>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Items Found</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-blue-400 font-mono">
            {items.filter(i => i.status === 'reunited').length || '—'}
          </p>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Reunited</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-yellow-400 font-mono">
            {items.filter(i => i.status === 'matched').length || '—'}
          </p>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Matched</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-4 mb-6">
        {/* Search bar */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search items, descriptions, locations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full bg-[#111827] border border-[#1F2D42] rounded-2xl pl-12 pr-4 py-3.5 text-white outline-none focus:border-orange-500/50 transition-all font-medium text-sm"
            />
          </div>
          <button
            onClick={handleSearch}
            className="bg-[#111827] border border-[#1F2D42] hover:border-orange-500/30 rounded-2xl px-5 py-3.5 text-gray-400 hover:text-orange-400 transition-all"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Type tabs */}
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-[#111827] border border-[#1F2D42] rounded-2xl p-1 mr-2">
            {(['all', 'lost', 'found'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTypeFilter(t); setCurrentPage(1) }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  typeFilter === t
                    ? t === 'lost' ? 'bg-orange-500 text-black shadow-lg' :
                      t === 'found' ? 'bg-green-500 text-black shadow-lg' :
                      'bg-orange-500 text-black shadow-lg'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {t === 'all' ? 'All' : t === 'lost' ? '🔴 Lost' : '🟢 Found'}
              </button>
            ))}
          </div>
          
          {/* Status filter */}
          <div className="flex bg-[#111827] border border-[#1F2D42] rounded-2xl p-1">
            {(['all', 'active', 'matched', 'reunited'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setCurrentPage(1) }}
                className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  statusFilter === s
                    ? 'bg-[#1A2235] text-white border border-[#2a3a52]'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {s === 'reunited' ? '✅ Reunited' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setCategoryFilter('all'); setCurrentPage(1) }}
            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
              categoryFilter === 'all'
                ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                : 'bg-[#111827] text-gray-500 border-[#1F2D42] hover:text-white hover:border-[#2a3a52]'
            }`}
          >
            All
          </button>
          {LF_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => { setCategoryFilter(cat.value); setCurrentPage(1) }}
              className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
                categoryFilter === cat.value
                  ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                  : 'bg-[#111827] text-gray-500 border-[#1F2D42] hover:text-white hover:border-[#2a3a52]'
              }`}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex gap-2 items-center">
          <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest mr-2">Date:</span>
          {DATE_RANGES.map(d => (
            <button
              key={d.value}
              onClick={() => { setDateRangeFilter(d.value as any); setCurrentPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                dateRangeFilter === d.value
                  ? 'bg-[#1A2235] text-white border border-[#2a3a52]'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {d.label}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={() => { setSearch(''); setTypeFilter('all'); setCategoryFilter('all'); setDateRangeFilter('all'); setStatusFilter('all'); setCurrentPage(1) }}
            className="text-[10px] text-gray-600 hover:text-orange-400 font-bold uppercase tracking-widest transition-colors"
          >
            Clear all filters
          </button>
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-[#111827] border border-[#1F2D42] rounded-3xl h-[380px] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[#111827] border border-dashed border-[#1F2D42] rounded-3xl p-16 text-center">
          <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-orange-400" />
          </div>
          <h3 className="text-xl font-black text-white mb-2">No items found</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-8 text-sm">
            Try adjusting your filters or be the first to report an item.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setSearch(''); setTypeFilter('all'); setCategoryFilter('all'); setDateRangeFilter('all') }}
              className="text-orange-400 font-bold hover:underline text-sm"
            >
              Clear all filters
            </button>
            <Link href="/citizen/lost-found/report"
              className="bg-orange-500 text-black font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-orange-400 transition-colors"
            >
              Report an Item
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                isOwner={item.reporter_id === userId}
                onView={() => setSelectedItem(item)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="flex items-center gap-1 px-4 py-2 bg-[#111827] border border-[#1F2D42] rounded-xl text-sm text-gray-400 hover:text-white disabled:opacity-40 transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-sm text-gray-500 font-mono">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 px-4 py-2 bg-[#111827] border border-[#1F2D42] rounded-xl text-sm text-gray-400 hover:text-white disabled:opacity-40 transition-all"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Detail Modal ───────────────────────────────────── */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          isOwner={selectedItem.reporter_id === userId}
          userId={userId}
          onClose={() => { setSelectedItem(null); setShowContactInfo(false) }}
          onRefresh={loadItems}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ITEM CARD COMPONENT
// ═══════════════════════════════════════════════════════════════

function ItemCard({ item, isOwner, onView }: { item: LFItem; isOwner: boolean; onView: () => void }) {
  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.active
  const categoryIcon = CATEGORY_ICONS[item.category] || '📦'
  const daysAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true })

  return (
    <div
      onClick={onView}
      className="bg-[#111827] border border-[#1F2D42] rounded-3xl overflow-hidden group hover:border-[#2a3a52] transition-all hover:translate-y-[-4px] cursor-pointer hover:shadow-xl hover:shadow-black/30"
    >
      {/* Image */}
      <div className="relative h-48 bg-[#0D1420]">
        {item.photo_url ? (
          <img src={item.photo_url} alt={item.item_name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <span className="text-5xl mb-2">{categoryIcon}</span>
            <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">No Image</span>
          </div>
        )}
        {/* Type badge */}
        <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
          item.report_type === 'lost'
            ? 'bg-orange-500/90 text-white border-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
            : 'bg-green-500/90 text-black border-green-600 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
        }`}>
          {item.report_type === 'lost' ? '🔴 LOST' : '🟢 FOUND'}
        </div>
        {/* Status if not active */}
        {item.status !== 'active' && (
          <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${status.class}`}>
            {status.icon} {status.label}
          </div>
        )}
        {/* Reward badge */}
        {item.has_reward && item.reward_amount && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-yellow-500/90 text-black px-2.5 py-1 rounded-lg text-[10px] font-black shadow-lg">
            <Award className="w-3 h-3" /> ₹{item.reward_amount.toLocaleString()}
          </div>
        )}
        {/* Match badge */}
        {item.status === 'matched' && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-2.5 py-1 rounded-lg text-[10px] font-black border border-yellow-500/30 animate-pulse">
            <Sparkles className="w-3 h-3" /> Match Found
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded-lg">
            {LF_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
          </span>
          <span className="text-[10px] text-gray-600 font-mono">#{item.id.slice(0, 8).toUpperCase()}</span>
        </div>

        <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-orange-400 transition-colors truncate">
          {item.item_name}
        </h3>

        <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed h-8">
          {item.description}
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2.5 text-xs text-gray-400">
            <MapPin className="w-3.5 h-3.5 text-blue-400/70 shrink-0" />
            <span className="truncate">{item.location_text}</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
            <span>{format(new Date(item.incident_date), 'MMM dd, yyyy')}</span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-600">{daysAgo}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-[#1F2D42] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400">
              {item.reporter?.full_name?.charAt(0) || 'U'}
            </div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
              {item.reporter?.full_name?.split(' ')[0] || 'User'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-600">
            {item.claim_count > 0 && (
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {item.claim_count} claim{item.claim_count > 1 ? 's' : ''}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {item.view_count}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ITEM DETAIL MODAL
// ═══════════════════════════════════════════════════════════════

function ItemDetailModal({
  item, isOwner, userId, onClose, onRefresh,
}: {
  item: LFItem; isOwner: boolean; userId: string | null; onClose: () => void; onRefresh: () => void
}) {
  const [showContact, setShowContact] = useState(false)
  const [claimMessage, setClaimMessage] = useState('')
  const [showClaimForm, setShowClaimForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.active
  const categoryIcon = CATEGORY_ICONS[item.category] || '📦'

  const handleClaim = async () => {
    if (claimMessage.length < 30) {
      setActionMsg('Please provide at least 30 characters to verify ownership.')
      return
    }
    setSubmitting(true)
    try {
      const { submitClaim } = await import('./actions')
      const fd = new FormData()
      fd.append('itemId', item.id)
      fd.append('claimMessage', claimMessage)
      const res = await submitClaim(fd)
      if (res.success) {
        setActionMsg('✅ Claim submitted! The reporter will be notified.')
        setShowClaimForm(false)
        onRefresh()
      } else {
        setActionMsg(res.error || 'Failed to submit claim.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkFound = async () => {
    setSubmitting(true)
    try {
      const { markFoundBySelf } = await import('./actions')
      const res = await markFoundBySelf(item.id)
      if (res.success) {
        setActionMsg('✅ Item marked as recovered!')
        onRefresh()
        setTimeout(onClose, 1200)
      } else {
        setActionMsg(res.error || 'Failed.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleArchive = async () => {
    setSubmitting(true)
    try {
      const { archiveItem } = await import('./actions')
      const res = await archiveItem(item.id)
      if (res.success) {
        setActionMsg('✅ Item archived.')
        onRefresh()
        setTimeout(onClose, 1200)
      } else {
        setActionMsg(res.error || 'Failed.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-[#111827] border border-[#1F2D42] rounded-[2rem] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white hover:bg-black transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Image */}
          <div className="h-[260px] md:h-full md:min-h-[600px] bg-[#0D1420] relative">
            {item.photo_url ? (
              <img src={item.photo_url} alt={item.item_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <span className="text-7xl mb-4">{categoryIcon}</span>
                <span className="text-xs font-black text-gray-700 uppercase tracking-widest">No Image Available</span>
              </div>
            )}
            {/* Badges on image */}
            <div className={`absolute top-4 left-4 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border ${
              item.report_type === 'lost'
                ? 'bg-orange-500 text-white border-orange-600 shadow-lg shadow-orange-500/30'
                : 'bg-green-500 text-black border-green-600 shadow-lg shadow-green-500/30'
            }`}>
              Item {item.report_type}
            </div>
            {item.has_reward && item.reward_amount && (
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-yellow-500 text-black px-4 py-2 rounded-xl text-xs font-black shadow-lg">
                <Award className="w-4 h-4" /> ₹{item.reward_amount.toLocaleString()} Reward
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Status */}
            <div className={`inline-block px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border ${status.class}`}>
              {status.icon} {status.label}
            </div>

            {/* Title */}
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-1 leading-tight">{item.item_name}</h2>
              <p className="text-orange-400 font-bold uppercase tracking-widest text-xs">
                {LF_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
              </p>
              {item.brand && (
                <p className="text-gray-500 text-xs mt-1">Brand: {item.brand}</p>
              )}
              {item.color && (
                <p className="text-gray-500 text-xs">Color: {item.color}</p>
              )}
            </div>

            {/* Location & Date */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Location</p>
                  <p className="text-sm font-bold text-white">{item.location_text}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Date {item.report_type}</p>
                  <p className="text-sm font-bold text-white">{format(new Date(item.incident_date), 'MMMM dd, yyyy')}</p>
                </div>
              </div>
              {item.expires_at && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-500/10 border border-gray-500/20 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Expires</p>
                    <p className="text-sm font-bold text-gray-400">{format(new Date(item.expires_at), 'MMMM dd, yyyy')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2">Description</h3>
              <p className="text-gray-400 leading-relaxed text-sm bg-[#0D1420] p-4 rounded-2xl border border-[#1F2D42]/60">
                {item.description}
              </p>
            </div>

            {/* Category Details */}
            {item.category_details && Object.keys(item.category_details).length > 0 && (
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2">Additional Details</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(item.category_details).map(([key, val]) => (
                    val ? (
                      <div key={key} className="bg-[#0D1420] border border-[#1F2D42]/40 rounded-xl p-3">
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                          {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs font-bold text-white mt-0.5">{String(val)}</p>
                      </div>
                    ) : null
                  ))}
                </div>
              </div>
            )}

            {/* Reporter + Contact */}
            <div className="pt-6 border-t border-[#1F2D42]">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                  {item.reporter?.full_name?.charAt(0) || item.contact_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Reported By</p>
                  <p className="text-sm font-black text-white">{item.reporter?.full_name || item.contact_name || 'User'}</p>
                </div>
              </div>

              {/* Contact Section */}
              {!isOwner && (
                <>
                  {!showContact ? (
                    <button
                      onClick={() => setShowContact(true)}
                      className="w-full py-4 bg-white hover:bg-gray-100 text-black font-black uppercase tracking-[0.15em] text-xs rounded-2xl transition-all shadow-xl shadow-white/5 active:scale-[0.98] mb-3"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Phone className="w-4 h-4" />
                        View Contact Info
                      </div>
                    </button>
                  ) : (
                    <div className="p-5 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl space-y-3 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Contact Details</span>
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded-md uppercase">Verified</span>
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-bold text-white">{item.contact_name}</span>
                        </div>
                        {(item.contact_phone && (item.show_phone || item.contact_via_platform)) && (
                          <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <a href={`tel:${item.contact_phone}`} className="text-sm font-bold text-blue-400 hover:underline tracking-widest">
                              {item.contact_phone}
                            </a>
                          </div>
                        )}
                        {(item.contact_email && (item.show_email || item.contact_via_platform)) && (
                          <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <a href={`mailto:${item.contact_email}`} className="text-sm font-bold text-blue-400 hover:underline">
                              {item.contact_email}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Claim Button */}
                  {['active', 'matched'].includes(item.status) && (
                    <>
                      {!showClaimForm ? (
                        <button
                          onClick={() => setShowClaimForm(true)}
                          className={`w-full py-4 font-black uppercase tracking-[0.15em] text-xs rounded-2xl transition-all active:scale-[0.98] ${
                            item.report_type === 'lost'
                              ? 'bg-green-500 hover:bg-green-400 text-black shadow-lg shadow-green-500/20'
                              : 'bg-orange-500 hover:bg-orange-400 text-black shadow-lg shadow-orange-500/20'
                          }`}
                        >
                          {item.report_type === 'lost' ? '🟢 I Found This Item' : '🔴 This is My Lost Item'}
                        </button>
                      ) : (
                        <div className="p-4 bg-[#0D1420] border border-[#1F2D42] rounded-2xl space-y-3">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Submit Your Claim</p>
                          <textarea
                            value={claimMessage}
                            onChange={e => setClaimMessage(e.target.value)}
                            placeholder="Describe how you can identify this item. Include specific details that only the owner would know (min 30 chars)..."
                            rows={4}
                            className="w-full bg-[#111827] border border-[#1F2D42] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500 resize-none"
                          />
                          <p className="text-[10px] text-gray-600">{claimMessage.length}/30 min characters</p>
                          <div className="flex gap-2">
                            <button onClick={() => setShowClaimForm(false)}
                              className="flex-1 py-3 bg-[#1A2235] text-gray-400 hover:text-white font-bold text-xs uppercase rounded-xl transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleClaim}
                              disabled={submitting || claimMessage.length < 30}
                              className="flex-1 py-3 bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs uppercase rounded-xl transition-all disabled:opacity-50"
                            >
                              {submitting ? 'Submitting...' : 'Submit Claim'}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Owner Actions */}
              {isOwner && ['active', 'matched', 'claimed'].includes(item.status) && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Manage Your Report</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleMarkFound}
                      disabled={submitting}
                      className="py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all disabled:opacity-50"
                    >
                      ✅ I Found It
                    </button>
                    <button
                      onClick={handleArchive}
                      disabled={submitting}
                      className="py-3.5 bg-[#1F2D42] hover:bg-[#2a3a52] text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all disabled:opacity-50"
                    >
                      📁 Archive
                    </button>
                  </div>
                  <Link href={`/citizen/lost-found/report?edit=${item.id}`}
                    className="block text-center py-3.5 bg-[#0D1420] border border-[#1F2D42] hover:border-orange-500/30 text-orange-400 font-bold uppercase tracking-widest text-[10px] rounded-2xl transition-all"
                  >
                    ✏️ Edit Details
                  </Link>
                  {item.claim_count > 0 && (
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 text-center">
                      <p className="text-blue-400 text-xs font-bold">{item.claim_count} claim(s) received</p>
                    </div>
                  )}
                </div>
              )}

              {/* Expired: Renew */}
              {isOwner && item.status === 'expired' && (
                <div className="space-y-3">
                  <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4 text-center">
                    <p className="text-yellow-400 text-sm font-bold mb-2">This listing has expired</p>
                    <p className="text-gray-500 text-xs">Renewals used: {item.renewal_count}/3</p>
                  </div>
                  {item.renewal_count < 3 && (
                    <button
                      onClick={async () => {
                        setSubmitting(true)
                        const { renewListing } = await import('./actions')
                        const res = await renewListing(item.id)
                        setActionMsg(res.success ? '✅ Listing renewed for 30 days!' : (res.error || 'Failed'))
                        setSubmitting(false)
                        if (res.success) onRefresh()
                      }}
                      disabled={submitting}
                      className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all disabled:opacity-50"
                    >
                      <RefreshCw className="w-4 h-4 inline mr-2" /> Renew for 30 Days
                    </button>
                  )}
                </div>
              )}

              {/* Action message */}
              {actionMsg && (
                <div className={`mt-3 p-3 rounded-xl text-center text-xs font-bold ${
                  actionMsg.startsWith('✅') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {actionMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
