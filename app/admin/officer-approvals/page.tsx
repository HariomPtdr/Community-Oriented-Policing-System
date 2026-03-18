import { createClient } from '@/lib/supabase/server'
import { Shield, Check, X, Eye, Clock, BadgeCheck } from 'lucide-react'
import { approveOfficer, rejectOfficer } from '@/app/(auth)/officer-signup/actions'
import { revalidatePath } from 'next/cache'

export default async function OfficerApprovalsPage() {
  const supabase = await createClient()
  
  // Fetch pending officers
  const { data: pendingOfficers, error } = await supabase
    .from('officer_profiles')
    .select(`
      id,
      badge_number,
      rank,
      role,
      approval_status,
      profiles (
        full_name,
        email,
        phone,
        department
      ),
      joining_date
    `)
    .eq('approval_status', 'pending_admin_approval')
    .order('created_at', { ascending: false })

  async function handleApprove(id: string) {
    'use server'
    await approveOfficer(id)
    revalidatePath('/admin/officer-approvals')
  }

  async function handleReject(id: string) {
    'use server'
    await rejectOfficer(id, 'Information provided does not match official records.')
    revalidatePath('/admin/officer-approvals')
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <BadgeCheck className="w-8 h-8 text-orange-500" />
            Officer <span className="text-orange-500">Approvals</span>
          </h1>
          <p className="text-gray-400 mt-2 font-medium">Verify and approve new officer registrations.</p>
        </div>
        <div className="bg-[#111827] border border-[#1F2D42] rounded-xl px-4 py-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-bold text-white uppercase tracking-widest">{pendingOfficers?.length || 0} Pending</span>
        </div>
      </div>

      <div className="space-y-4">
        {pendingOfficers && pendingOfficers.length > 0 ? (
          pendingOfficers.map((officer: any) => (
            <div key={officer.id} className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-orange-500/30 transition-all shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20 shrink-0">
                  <Shield className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">{officer.profiles.full_name}</h3>
                    <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                      {officer.rank}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <span>Badge: <span className="text-gray-300">{officer.badge_number}</span></span>
                    <span>Email: <span className="text-gray-300">{officer.profiles.email}</span></span>
                    <span>Phone: <span className="text-gray-300">{officer.profiles.phone}</span></span>
                    <span>Joined: <span className="text-gray-300">{new Date(officer.joining_date).toLocaleDateString()}</span></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-[#1A2235] border border-[#1F2D42] text-gray-400 rounded-xl text-xs font-black uppercase tracking-widest hover:text-white transition-all">
                  <Eye className="w-4 h-4" /> View Docs
                </button>
                <form action={handleApprove.bind(null, officer.id)}>
                  <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-green-900/20">
                    <Check className="w-4 h-4" /> Approve
                  </button>
                </form>
                <form action={handleReject.bind(null, officer.id)}>
                  <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-900/20">
                    <X className="w-4 h-4" /> Reject
                  </button>
                </form>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-[#111827] border border-dashed border-[#1F2D42] rounded-3xl p-20 text-center">
            <div className="w-20 h-20 bg-[#1A2235] rounded-full flex items-center justify-center mx-auto mb-6">
              <BadgeCheck className="w-10 h-10 text-gray-700" />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">No Pending Approvals</h3>
            <p className="text-gray-500 font-medium tracking-wide">All registrations have been processed.</p>
          </div>
        )}
      </div>
    </div>
  )
}
