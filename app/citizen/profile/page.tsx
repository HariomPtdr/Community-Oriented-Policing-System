'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  UserCircle, Mail, Phone, MapPin, Camera,
  Save, Loader2, Shield, Bell, Lock, Trash2,
  FileText, Clock, CheckCircle, AlertTriangle,
  ChevronRight, Eye, EyeOff, Download, Star,
  Calendar, Settings, Edit3, User, Hash, Flag, Navigation,
  Upload, Search, Image as ImageIcon
} from 'lucide-react'
import {
  getStateNames, getDistrictsForState, getCitiesForDistrict,
  getTehsilsForDistrict, getPoliceStationsForTehsil,
  lookupPincode, ID_PROOF_TYPES, ID_VALIDATION_RULES, GENDER_OPTIONS,
} from '@/lib/data/indian-locations'
import { SecurityShell } from '@/components/profile/security/SecurityShell'
import { ActivityShell } from '@/components/profile/activity/ActivityShell'

type ProfileData = {
  id: string
  full_name: string
  phone: string
  avatar_url: string

  address: string
  neighborhood_id: string | null
  created_at: string
  updated_at: string
  
  // Extended Fields
  father_husband_name: string | null
  mother_name: string | null
  gender: string | null
  alternate_mobile: string | null
  id_proof_type: string | null
  id_number: string | null
  pincode: string | null
  state: string | null
  district: string | null
  city_town: string | null
  tehsil_division: string | null
  police_station_area: string | null
  full_address: string | null
  profile_completed: boolean | null
  id_proof_url: string | null
}

type Stats = {
  totalReports: number
  activeReports: number
  resolvedReports: number
  forumPosts: number
  sosEvents: number
}


export default function CitizenProfilePage() {
  const supabase = createClient()
  const router = useRouter()

  /* state */
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [email, setEmail] = useState('')
  const [stats, setStats] = useState<Stats>({ totalReports: 0, activeReports: 0, resolvedReports: 0, forumPosts: 0, sosEvents: 0 })
  const [neighborhoodName, setNeighborhoodName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'preferences' | 'activity'>('personal')

  /* core form fields */
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')


  /* extended form fields */
  const [editFatherHub, setEditFatherHub] = useState('')
  const [editMother, setEditMother] = useState('')
  const [editGender, setEditGender] = useState('')
  const [editAltMobile, setEditAltMobile] = useState('')
  const [editIdType, setEditIdType] = useState('')
  const [editIdNum, setEditIdNum] = useState('')
  
  /* address fields */
  const [editPincode, setEditPincode] = useState('')
  const [editState, setEditState] = useState('')
  const [editDistrict, setEditDistrict] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editTehsil, setEditTehsil] = useState('')
  const [editPs, setEditPs] = useState('')
  const [editAddress, setEditAddress] = useState('')

  /* pincode auto-fill for address */
  const [pinLoading, setPinLoading] = useState(false)
  const [pinFound, setPinFound] = useState(false)

  /* id proof upload */
  const idProofInputRef = useRef<HTMLInputElement>(null)
  const [idProofUploading, setIdProofUploading] = useState(false)
  const [idProofUrl, setIdProofUrl] = useState('')
  const [uploadIdType, setUploadIdType] = useState('')

  /* ui state */
  const [isEditingPersonal, setIsEditingPersonal] = useState(false)
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [isReuploadingId, setIsReuploadingId] = useState(false)

  /* security */
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  /* preferences */
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [pushNotifs, setPushNotifs] = useState(true)
  const [sosNotifs, setSosNotifs] = useState(true)
  const [alertNotifs, setAlertNotifs] = useState(true)
  const [reportNotifs, setReportNotifs] = useState(true)

  /* avatar */
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  /* ── fetch data ──────────────────────────────────────── */
  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email || '')

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()

      if (p) {
        setProfile(p as ProfileData)
        setEditName(p.full_name || '')
        setEditPhone(p.phone || '')

        
        setEditFatherHub(p.father_husband_name || '')
        setEditMother(p.mother_name || '')
        setEditGender(p.gender || '')
        setEditAltMobile(p.alternate_mobile || '')
        setEditIdType(p.id_proof_type || '')
        setEditIdNum(p.id_number || '')

        setEditAddress(p.full_address || p.address || '')
        setEditPincode(p.pincode || '')
        setEditState(p.state || '')
        setEditDistrict(p.district || '')
        setEditCity(p.city_town || '')
        setEditTehsil(p.tehsil_division || '')
        setEditPs(p.police_station_area || '')
        setIdProofUrl(p.id_proof_url || '')
        setUploadIdType(p.id_proof_type || '')

        if (p.neighborhood_id) {
          const { data: nbr } = await supabase.from('neighborhoods')
            .select('name').eq('id', p.neighborhood_id).single()
          if (nbr) setNeighborhoodName(nbr.name)
        }
      }

      const [{ count: total }, { count: active }, { count: resolved }, { count: posts }, { count: sos }] = await Promise.all([
        supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('reporter_id', user.id),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('reporter_id', user.id).in('status', ['submitted', 'under_review', 'assigned', 'in_progress']),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('reporter_id', user.id).in('status', ['resolved', 'closed']),
        supabase.from('forum_posts').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
        supabase.from('sos_events').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      ])

      setStats({
        totalReports: total || 0,
        activeReports: active || 0,
        resolvedReports: resolved || 0,
        forumPosts: posts || 0,
        sosEvents: sos || 0,
      })

      setLoading(false)
    }
    fetchAll()
  }, [router])

  /* ── pincode auto-fill ──────────────────────────────── */
  const handlePincodeChange = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 6)
    setEditPincode(clean)
    setPinFound(false)
    if (clean.length === 6) {
      setPinLoading(true)
      const result = await lookupPincode(clean)
      if (result) {
        setEditState(result.state)
        setEditDistrict(result.district)
        setEditCity(result.city || '')
        setEditTehsil(result.division || '')
        setEditPs('')
        setPinFound(true)
      }
      setPinLoading(false)
    }
  }

  /* ── ID proof upload ───────────────────────────────── */
  const handleIdProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setIdProofUploading(true)
    const fileExt = file.name.split('.').pop()
    const filePath = `id-proofs/${profile.id}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('id-proofs').upload(filePath, file, { upsert: true })
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('id-proofs').getPublicUrl(filePath)
      const url = urlData.publicUrl
      await supabase.from('profiles').update({ id_proof_url: url, id_proof_type: uploadIdType }).eq('id', profile.id)
      setIdProofUrl(url)
      setProfile(prev => prev ? { ...prev, id_proof_url: url, id_proof_type: uploadIdType } : null)
    }
    setIdProofUploading(false)
  }

  /* ── save profile ────────────────────────────────────── */
  const saveProfile = async () => {
    if (!profile) return
    setSaving(true)
    setSaveSuccess(false)

    // When profile_completed, phone is NOT editable. Only mother, alt mobile, and ALL address fields
    const updateData = profile.profile_completed
      ? {
          mother_name: editMother.trim(),
          alternate_mobile: editAltMobile.trim(),
          pincode: editPincode.trim(),
          state: editState.trim(),
          district: editDistrict.trim(),
          city_town: editCity.trim(),
          tehsil_division: editTehsil.trim(),
          police_station_area: editPs.trim(),
          full_address: editAddress.trim(),
          address: editAddress.trim(),
        }
      : {
          full_name: editName.trim(),
          phone: editPhone.trim(),
          father_husband_name: editFatherHub.trim(),
          mother_name: editMother.trim(),
          gender: editGender,
          alternate_mobile: editAltMobile.trim(),
          id_proof_type: editIdType,
          id_number: editIdNum.trim(),
          pincode: editPincode.trim(),
          state: editState.trim(),
          district: editDistrict.trim(),
          city_town: editCity.trim(),
          tehsil_division: editTehsil.trim(),
          police_station_area: editPs.trim(),
          full_address: editAddress.trim(),
          address: editAddress.trim(),
        }

    const { error } = await supabase.from('profiles').update(updateData).eq('id', profile.id)

    setSaving(false)
    if (!error) {
      setSaveSuccess(true)
      setProfile(prev => prev ? { 
        ...prev, full_name: editName, phone: editPhone,
        father_husband_name: editFatherHub, mother_name: editMother, gender: editGender,
        alternate_mobile: editAltMobile, id_proof_type: editIdType, id_number: editIdNum,
        pincode: editPincode, state: editState, district: editDistrict, city_town: editCity,
        tehsil_division: editTehsil, police_station_area: editPs, full_address: editAddress
      } : null)
      setIsEditingPersonal(false)
      setIsEditingAddress(false)
      setIsReuploadingId(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  const changePassword = async () => {
    setPasswordError('')
    setPasswordSuccess(false)
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return }

    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)

    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 3000)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setAvatarUploading(true)
    const fileExt = file.name.split('.').pop()
    const filePath = `avatars/${profile.id}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const avatarUrl = urlData.publicUrl

      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profile.id)
      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null)
    }
    setAvatarUploading(false)
  }

  const downloadData = async () => {
    if (!profile) return
    const data = {
      profile: { ...profile, email },
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `cops-profile-${profile.id.slice(0, 8)}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const TABS = [
    { key: 'personal', label: 'Personal Info', icon: UserCircle },
    { key: 'security', label: 'Security', icon: Lock },
    { key: 'preferences', label: 'Preferences', icon: Settings },
    { key: 'activity', label: 'Activity', icon: FileText },
  ] as const

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl overflow-hidden mb-6">
        <div className="h-32 bg-gradient-to-r from-orange-600/30 via-amber-600/20 to-red-600/10 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZjk1MDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMC0yOHY2aDZ2LTZoLTZ6bTI4IDI4djZoNnYtNmgtNnptMC0yOHY2aDZ2LTZoLTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        </div>

        <div className="px-6 pb-6 -mt-12 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="relative group flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 border-4 border-[#111827] flex items-center justify-center text-3xl font-bold text-white shadow-xl overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  editName.charAt(0).toUpperCase() || 'C'
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                {avatarUploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white truncate">{editName || 'Citizen'}</h1>
              <p className="text-sm text-gray-400 truncate">{email}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="bg-gray-800 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Citizen</span>
                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Member since {memberSince}
                </span>
                {editCity && (
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {editCity}, {editState}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-xl font-bold text-white font-mono">{stats.totalReports}</p>
                <p className="text-[10px] text-gray-500">Reports</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-green-400 font-mono">{stats.resolvedReports}</p>
                <p className="text-[10px] text-gray-500">Resolved</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-[#111827] border border-[#1F2D42] rounded-xl p-1 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-orange-500/10 text-orange-400 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'personal' && (
        <div className="space-y-6">
          {/* Locked fields notice */}
          {profile.profile_completed && (
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-3">
              <Lock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-400 text-xs font-semibold">Identity data is locked</p>
                <p className="text-gray-400 text-[11px] mt-0.5">Name, Father&apos;s Name, Gender, and ID Proof fields are locked at registration. <strong className="text-emerald-400">Address fields can be updated</strong> since you may be transferred or relocate.</p>
              </div>
            </div>
          )}

          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-orange-400" /> Account & Personal Information
              </h2>
              {profile.profile_completed && !isEditingPersonal && (
                <button type="button" onClick={() => setIsEditingPersonal(true)}
                  className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
                  <Edit3 className="w-3.5 h-3.5" /> Edit Info
                </button>
              )}
              {profile.profile_completed && isEditingPersonal && (
                <span className="text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full flex items-center gap-1"><Edit3 className="w-2.5 h-2.5" /> Editing</span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name — locked after registration */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Full Name {profile.profile_completed && <Lock className="w-3 h-3 text-amber-500" />}
                </label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" value={editName} readOnly={!!profile.profile_completed}
                    onChange={e => !profile.profile_completed && setEditName(e.target.value)}
                    className={`w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-colors ${
                      profile.profile_completed ? 'text-gray-500 cursor-not-allowed' : 'text-white focus:border-orange-500/50'
                    }`} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="email" value={email} readOnly
                    className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl pl-10 pr-4 py-3 text-sm text-gray-500 cursor-not-allowed" />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Phone Number {profile.profile_completed && <Lock className="w-3 h-3 text-amber-500" />}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="tel" value={editPhone} readOnly={!!profile.profile_completed}
                    onChange={e => !profile.profile_completed && setEditPhone(e.target.value)}
                    maxLength={10} onInput={(e) => { if (!profile.profile_completed) e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '') }}
                    className={`w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl pl-10 pr-4 py-3 text-sm transition-colors ${
                      profile.profile_completed ? 'text-gray-500 cursor-not-allowed' : 'text-white placeholder:text-gray-600 outline-none focus:border-orange-500/50'
                    }`} />
                </div>
              </div>
            </div>

            <div className="w-full h-[1px] bg-slate-800 my-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Father's Name — locked */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Father&apos;s/Husband&apos;s Name {profile.profile_completed && <Lock className="w-3 h-3 text-amber-500" />}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" value={editFatherHub} readOnly={!!profile.profile_completed}
                    onChange={e => !profile.profile_completed && setEditFatherHub(e.target.value)}
                    className={`w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-colors ${
                      profile.profile_completed ? 'text-gray-500 cursor-not-allowed' : 'text-white focus:border-orange-500/50'
                    }`} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mother&apos;s Name (Optional)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" value={editMother} onChange={e => setEditMother(e.target.value)}
                    readOnly={!!profile.profile_completed && !isEditingPersonal}
                    className={`w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl pl-10 pr-4 py-3 text-sm transition-colors ${
                      (profile.profile_completed && !isEditingPersonal) ? 'text-gray-400 cursor-default' : 'text-white placeholder:text-gray-600 outline-none focus:border-orange-500/50'
                    }`} />
                </div>
              </div>

              {/* Gender — locked */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Gender {profile.profile_completed && <Lock className="w-3 h-3 text-amber-500" />}
                </label>
                {profile.profile_completed ? (
                  <div className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl px-4 py-3 text-sm text-gray-500 capitalize cursor-not-allowed">
                    {editGender || '—'}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {GENDER_OPTIONS.map(g => (
                      <button key={g.value} type="button" onClick={() => setEditGender(g.value)}
                        className={`py-2.5 rounded-xl border text-sm capitalize transition-all ${
                          editGender === g.value ? 'border-orange-500 bg-orange-500/10 text-orange-400 font-bold' : 'border-[#1F2D42] text-gray-400 bg-[#0D1420] hover:border-gray-600'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Alternate Mobile (Optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="tel" value={editAltMobile} onChange={e => setEditAltMobile(e.target.value)}
                    readOnly={!!profile.profile_completed && !isEditingPersonal}
                    maxLength={10} onInput={(e) => { if (!(profile.profile_completed && !isEditingPersonal)) e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '') }}
                    className={`w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl pl-10 pr-4 py-3 text-sm transition-colors ${
                      (profile.profile_completed && !isEditingPersonal) ? 'text-gray-400 cursor-default' : 'text-white placeholder:text-gray-600 outline-none focus:border-orange-500/50'
                    }`} />
                </div>
              </div>

              {/* ID Proof Type — locked */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  ID Proof Type {profile.profile_completed && <Lock className="w-3 h-3 text-amber-500" />}
                </label>
                {profile.profile_completed ? (
                  <div className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl px-4 py-3 text-sm text-gray-500 cursor-not-allowed">
                    {ID_PROOF_TYPES.find(t => t.value === editIdType)?.label || editIdType || '—'}
                  </div>
                ) : (
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <select value={editIdType} onChange={e => setEditIdType(e.target.value)}
                      className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-orange-500/50 transition-colors appearance-none">
                      <option value="">Select ID Type</option>
                      {ID_PROOF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 rotate-90" />
                  </div>
                )}
              </div>

              {/* ID Number — locked */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  ID Number {profile.profile_completed && <Lock className="w-3 h-3 text-amber-500" />}
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" value={editIdNum} readOnly={!!profile.profile_completed}
                    onChange={e => !profile.profile_completed && setEditIdNum(e.target.value)} maxLength={20}
                    className={`w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl pl-10 pr-4 py-3 text-sm uppercase transition-colors ${
                      profile.profile_completed ? 'text-gray-500 cursor-not-allowed' : 'text-white outline-none focus:border-orange-500/50'
                    }`} />
                </div>
              </div>
            </div>
          </div>

          {/* Address Section — ALWAYS EDITABLE with Cascading Dropdowns */}
          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-400" /> Address Information</span>
              {(profile.profile_completed && !isEditingAddress) && (
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1F2D42]/50 hover:bg-[#1F2D42] text-gray-300 text-xs font-semibold rounded-lg transition-colors border border-slate-700/50"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Address
                </button>
              )}
              {(profile.profile_completed && isEditingAddress) && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1"><Edit3 className="w-2.5 h-2.5" /> Editing</span>
              )}
            </h2>

            {(profile.profile_completed && !isEditingAddress) ? (
              <div className="bg-[#0D1420] border border-[#1F2D42] rounded-xl p-5">
                <p className="text-sm text-gray-300 leading-relaxed font-medium">
                  {profile.full_address || profile.address || "No address provided."}
                </p>
                {(profile.city_town || profile.district) && (
                  <p className="text-xs text-gray-500 mt-2.5 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5" />
                    {[profile.city_town, profile.district, profile.state, profile.pincode].filter(Boolean).join(', ')}
                  </p>
                )}
                {profile.police_station_area && (
                  <p className="text-xs text-emerald-500/80 mt-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    {profile.police_station_area} PS Area
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">

            {/* Pincode Quick Fill */}
            <div className="p-3 bg-[#0B0F1A] border border-blue-500/15 rounded-xl mb-4">
              <p className="text-[10px] text-blue-400 mb-2 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3 h-3" /> Quick Fill — Enter pincode to auto-detect location
              </p>
              <div className="flex gap-2 items-center">
                <div className="flex-1 max-w-[200px]">
                  <input value={editPincode} onChange={e => handlePincodeChange(e.target.value)}
                    placeholder="6-digit pincode" maxLength={6}
                    className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none focus:border-orange-500/50 transition-colors" />
                </div>
                {pinLoading && <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />}
                {pinFound && <span className="text-[10px] text-green-400 font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Location detected</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* State Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">State</label>
                <div className="relative">
                  <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select value={editState} onChange={e => { setEditState(e.target.value); setEditDistrict(''); setEditCity(''); setEditTehsil(''); setEditPs('') }}
                    className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-orange-500/50 transition-colors appearance-none">
                    <option value="">Select State</option>
                    {getStateNames().map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 rotate-90" />
                </div>
              </div>

              {/* District Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">District</label>
                <select value={editDistrict} onChange={e => { setEditDistrict(e.target.value); setEditCity(''); setEditTehsil(''); setEditPs('') }}
                  disabled={!editState}
                  className={`w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50 transition-colors appearance-none ${!editState ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <option value="">{editState ? 'Select District' : 'Select state first'}</option>
                  {getDistrictsForState(editState).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* City Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">City / Town</label>
                <select value={editCity} onChange={e => setEditCity(e.target.value)}
                  disabled={!editDistrict}
                  className={`w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50 transition-colors appearance-none ${!editDistrict ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <option value="">{editDistrict ? 'Select City' : 'Select district first'}</option>
                  {getCitiesForDistrict(editState, editDistrict).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Tehsil Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tehsil / Division</label>
                <select value={editTehsil} onChange={e => { setEditTehsil(e.target.value); setEditPs('') }}
                  disabled={!editDistrict}
                  className={`w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/50 transition-colors appearance-none ${!editDistrict ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <option value="">{editDistrict ? 'Select Tehsil' : 'Select district first'}</option>
                  {getTehsilsForDistrict(editState, editDistrict).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Police Station Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Police Station Area</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select value={editPs} onChange={e => setEditPs(e.target.value)}
                    disabled={!editTehsil}
                    className={`w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-orange-500/50 transition-colors appearance-none ${!editTehsil ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <option value="">{editTehsil ? 'Select Police Station' : 'Select tehsil first'}</option>
                    {getPoliceStationsForTehsil(editTehsil).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 rotate-90" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Residential Address</label>
                <div className="relative">
                  <Navigation className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <textarea value={editAddress} onChange={e => setEditAddress(e.target.value)} rows={3} placeholder="Full address"
                    className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-orange-500/50 transition-colors resize-none" />
                </div>
              </div>
            </div>
            </div>
            )}
          </div>

          {/* ═══ ID PROOF DOCUMENT UPLOAD ═══ */}
          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-400" /> ID Proof Document
              {uploadIdType && <span className="ml-2 text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{ID_PROOF_TYPES.find(t => t.value === uploadIdType)?.label || uploadIdType}</span>}
            </h2>

            {idProofUrl && !isReuploadingId ? (
              <div className="bg-[#0D1420] border border-[#1F2D42] rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Document Uploaded Successfully</h3>
                    <p className="text-xs text-gray-400 mt-1">Your ID proof is securely stored.</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <a href={idProofUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-4 py-2.5 bg-[#1F2D42] hover:bg-slate-700 text-sm font-medium text-white rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" /> View File
                  </a>
                  <button type="button" onClick={() => setIsReuploadingId(true)} className="w-full sm:w-auto px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-medium text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" /> Re-upload
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Upload area */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Upload New Document</label>
                  
                  <div className="mb-4">
                    <select value={uploadIdType} onChange={e => setUploadIdType(e.target.value)}
                      className="w-full bg-[#0D1420] border border-[#1F2D42] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50 transition-colors appearance-none">
                      <option value="">-- Select Document Type to Upload --</option>
                      {ID_PROOF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>

                  {!uploadIdType ? (
                    <div className="border-2 border-dashed border-[#1F2D42] rounded-xl p-6 text-center bg-[#0D1420]/50 opacity-40 cursor-not-allowed">
                      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      <p className="text-xs text-amber-400">Select Document Type First</p>
                    </div>
                  ) : (
                    <div
                      onClick={() => idProofInputRef.current?.click()}
                      className="border-2 border-dashed border-[#1F2D42] hover:border-blue-500/40 rounded-xl p-6 text-center cursor-pointer transition-colors group bg-[#0D1420]"
                    >
                      {idProofUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                          <p className="text-xs text-gray-400">Uploading...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-8 h-8 text-gray-500 group-hover:text-blue-400 transition-colors" />
                          <p className="text-xs text-gray-400 group-hover:text-white transition-colors">Click to upload {ID_PROOF_TYPES.find(t => t.value === uploadIdType)?.label || 'Document'}</p>
                          <p className="text-[10px] text-gray-600">PNG, JPG, or PDF • Max 5MB</p>
                        </div>
                      )}
                    </div>
                  )}
                  <input ref={idProofInputRef} type="file" accept="image/*,.pdf" onChange={handleIdProofUpload} className="hidden" />
                </div>

                {/* Preview */}
                <div className="h-full flex flex-col">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Current Document</label>
                  {idProofUrl ? (
                    <div className="border border-[#1F2D42] rounded-xl bg-[#0D1420] flex-1 min-h-[160px] flex flex-col items-center justify-center p-6 text-center">
                      <FileText className="w-10 h-10 text-orange-400 mb-3" />
                      <p className="text-sm font-medium text-white mb-1">Document Uploaded</p>
                      <a href={idProofUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 underline mt-2 flex items-center justify-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> View full document
                      </a>
                    </div>
                  ) : (
                    <div className="border border-[#1F2D42] rounded-xl bg-[#0D1420]/30 flex-1 min-h-[160px] flex flex-col items-center justify-center p-6 text-center">
                      <FileText className="w-8 h-8 text-[#1F2D42] mx-auto mb-2" />
                      <p className="text-xs text-gray-500">No document uploaded yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {isReuploadingId && (
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => setIsReuploadingId(false)} className="text-xs text-gray-500 hover:text-white transition-colors underline underline-offset-4">
                  Cancel Re-upload
                </button>
              </div>
            )}
          </div>
          {(!profile.profile_completed || isEditingPersonal || isEditingAddress || isReuploadingId) && (
            <div className="mt-8 pt-6 border-t border-[#1F2D42]/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className={`relative overflow-hidden w-full sm:w-auto font-bold px-8 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 group ${
                    !profile.profile_completed 
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-xl shadow-orange-600/20'
                      : 'bg-[#1F2D42] hover:bg-slate-700 text-white shadow-lg shadow-black/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : !profile.profile_completed ? (
                    <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  ) : (
                    <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  )}
                  {saving ? 'Processing...' : !profile.profile_completed ? 'Submit Profile Registration' : 'Save Changes'}
                  
                  {/* Subtle shine effect on submit button for new registrations */}
                  {!profile.profile_completed && (
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                  )}
                </button>

                {profile.profile_completed && (
                  <button
                    onClick={() => {
                      setIsEditingPersonal(false)
                      setIsEditingAddress(false)
                      setIsReuploadingId(false)
                      setEditMother(profile.mother_name || '')
                      setEditAltMobile(profile.alternate_mobile || '')
                      setEditPincode(profile.pincode || '')
                      setEditState(profile.state || '')
                      setEditDistrict(profile.district || '')
                      setEditCity(profile.city_town || '')
                      setEditTehsil(profile.tehsil_division || '')
                      setEditPs(profile.police_station_area || '')
                      setEditAddress(profile.full_address || profile.address || '')
                    }}
                    disabled={saving}
                    className="w-full sm:w-auto bg-transparent hover:bg-[#1F2D42]/50 border border-[#1F2D42] text-gray-400 hover:text-white font-semibold px-6 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>
              
              {saveSuccess && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl animate-in fade-in slide-in-from-bottom-4 w-full sm:w-auto justify-center">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-semibold">Profile updated successfully!</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'security' && (
        <SecurityShell />
      )}

      {activeTab === 'preferences' && (
        <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-400" /> Notification Preferences
          </h2>

          <div className="space-y-1">
            {[
              { key: 'email', label: 'Email Notifications', desc: 'Receive updates via email', state: emailNotifs, set: setEmailNotifs, icon: Mail },
              { key: 'push', label: 'Push Notifications', desc: 'Browser push notifications for urgent alerts', state: pushNotifs, set: setPushNotifs, icon: Bell },
              { key: 'sos', label: 'SOS / Emergency Alerts', desc: 'Critical emergency alerts in your area (recommended)', state: sosNotifs, set: setSosNotifs, icon: AlertTriangle },
              { key: 'alerts', label: 'Area Safety Alerts', desc: 'Crime alerts, missing person notices near you', state: alertNotifs, set: setAlertNotifs, icon: Shield },
              { key: 'reports', label: 'Report Status Updates', desc: 'When your report status changes', state: reportNotifs, set: setReportNotifs, icon: FileText },
            ].map(pref => {
              const Icon = pref.icon
              return (
                <div key={pref.key} className="flex items-center justify-between p-4 bg-[#0D1420] border border-[#1F2D42]/50 rounded-xl hover:border-[#2a3a52] transition-colors">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-white font-medium">{pref.label}</p>
                      <p className="text-xs text-gray-500">{pref.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => pref.set(!pref.state)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${pref.state ? 'bg-orange-500' : 'bg-gray-700'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-md ${pref.state ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <ActivityShell />
      )}
    </div>
  )
}
