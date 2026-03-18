'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import {
  Scale, Calendar, Clock, MapPin, FileText, Loader2,
  RefreshCw, ChevronRight, AlertTriangle, CheckCircle,
  User, Filter, Search
} from 'lucide-react'

export default function CourtSchedulePage() {
  const { user } = useCurrentUser()
  const supabase = createClient()
  const [hearings, setHearings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming')

  const loadData = useCallback(async () => {
    if (!user?.stationId) return
    const now = new Date().toISOString()

    // Try court_hearings table
    let { data, error } = await supabase
      .from('court_hearings')
      .select(`
        *,
        fir_records!fir_id(fir_number, case_status),
        officer_profiles!io_id(id, badge_number, rank)
      `)
      .order('hearing_date', { ascending: true })
      .limit(50)

    if (error || !data) {
      // Fallback: check for incidents with hearing data
      const { data: incidents } = await supabase
        .from('incidents')
        .select('id, fir_number, next_hearing_date, court_name, court_case_number, case_type, assigned_officer_id')
        .not('next_hearing_date', 'is', null)
        .order('next_hearing_date', { ascending: true })

      data = (incidents || []).map(inc => ({
        id: inc.id,
        fir_number: inc.fir_number,
        hearing_date: inc.next_hearing_date,
        court_name: inc.court_name || 'District Court',
        court_case_number: inc.court_case_number,
        hearing_type: 'Regular',
        notes: '',
        _legacy: true,
      }))
    }

    setHearings(data || [])
    setLoading(false)
  }, [user?.stationId])

  useEffect(() => { loadData() }, [loadData])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filtered = hearings.filter(h => {
    if (!h.hearing_date) return false
    const hDate = new Date(h.hearing_date)
    if (filter === 'upcoming') return hDate >= today
    if (filter === 'past') return hDate < today
    return true
  })

  const upcoming7Days = hearings.filter(h => {
    if (!h.hearing_date) return false
    const d = new Date(h.hearing_date)
    return d >= today && d <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  })

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Scale className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-white">Court Schedule</h1>
            <p className="text-xs text-gray-500">Hearing dates · Case calendar · Court appearances</p>
          </div>
        </div>
        <button onClick={loadData}
          className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white bg-[#111827] border border-[#1F2D42] px-3 py-2 rounded-xl transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-3 text-center">
          <p className="text-lg font-heading font-bold text-white">{hearings.length}</p>
          <p className="text-[9px] text-gray-500 uppercase tracking-wider">Total Hearings</p>
        </div>
        <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-3 text-center">
          <p className={`text-lg font-heading font-bold ${upcoming7Days.length > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
            {upcoming7Days.length}
          </p>
          <p className="text-[9px] text-gray-500 uppercase tracking-wider">Next 7 Days</p>
        </div>
        <div className="bg-[#111827] border border-[#1F2D42] rounded-xl p-3 text-center">
          <p className="text-lg font-heading font-bold text-purple-400">
            {hearings.filter(h => h.hearing_date && new Date(h.hearing_date).toDateString() === new Date().toDateString()).length}
          </p>
          <p className="text-[9px] text-gray-500 uppercase tracking-wider">Today</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-[#111827] border border-[#1F2D42] rounded-xl p-1">
        {(['upcoming', 'past', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all capitalize ${
              filter === f ? 'bg-[#0B0F1A] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {f} ({f === 'upcoming' ? hearings.filter(h => h.hearing_date && new Date(h.hearing_date) >= today).length : f === 'past' ? hearings.filter(h => h.hearing_date && new Date(h.hearing_date) < today).length : hearings.length})
          </button>
        ))}
      </div>

      {/* Hearings List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl py-16 text-center">
          <Scale className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No court hearings found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(h => {
            const hDate = new Date(h.hearing_date)
            const isToday = hDate.toDateString() === new Date().toDateString()
            const isPast = hDate < today
            return (
              <div key={h.id}
                className={`bg-[#111827] border rounded-xl p-4 flex items-center gap-4 transition-all ${
                  isToday ? 'border-amber-500/30 bg-amber-500/5' : isPast ? 'border-[#1F2D42] opacity-60' : 'border-[#1F2D42] hover:border-purple-500/30'
                }`}
              >
                <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center text-center flex-shrink-0 ${
                  isToday ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-[#0D1420] border border-[#1F2D42]'
                }`}>
                  <span className={`text-[10px] font-bold uppercase ${isToday ? 'text-amber-400' : 'text-gray-500'}`}>
                    {hDate.toLocaleDateString('en-IN', { month: 'short' })}
                  </span>
                  <span className={`text-lg font-heading font-bold ${isToday ? 'text-amber-300' : 'text-white'}`}>
                    {hDate.getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {isToday && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold">TODAY</span>}
                    <p className="text-sm text-white font-medium">FIR: {h.fir_number || '—'}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1"><Scale className="w-3 h-3" /> {h.court_name || '—'}</span>
                    {h.court_case_number && <span className="font-mono text-gray-600">#{h.court_case_number}</span>}
                  </div>
                  {h.hearing_type && (
                    <p className="text-[10px] text-gray-600 mt-1">Type: {h.hearing_type}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">
                    {hDate.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
