'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, User, Loader2, CheckCircle, MapPin, Search, Lock } from 'lucide-react'
import {
  getStateNames, getDistrictsForState, getCitiesForDistrict,
  getTehsilsForDistrict, getPoliceStationsForTehsil,
  lookupPincode, ID_PROOF_TYPES, ID_VALIDATION_RULES, GENDER_OPTIONS,
} from '@/lib/data/indian-locations'

// Only handling citizen signup here

// ── Reusable form helpers ─────────────────────────────────────
const inputCls = (err?: string) =>
  `w-full bg-[#0D1420] border ${err ? 'border-red-500/50' : 'border-[#1F2D42]'} rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-orange-500/40 transition-colors`

const selectCls = (err?: string) =>
  `w-full bg-[#0D1420] border ${err ? 'border-red-500/50' : 'border-[#1F2D42]'} rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-500/40 transition-colors appearance-none cursor-pointer`

function Label({ text, required }: { text: string; required?: boolean }) {
  return <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{text} {required && <span className="text-orange-500">*</span>}</label>
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="text-red-400 text-[10px] mt-0.5">{msg}</p> : null
}

// ── Main Component ────────────────────────────────────────────
export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [globalError, setGlobalError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Account
  const role = 'citizen'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')

  // Personal
  const [fatherName, setFatherName] = useState('')
  const [motherName, setMotherName] = useState('')
  const [gender, setGender] = useState('')
  const [altMobile, setAltMobile] = useState('')
  const [idType, setIdType] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [idError, setIdError] = useState('')

  // Address
  const [pincode, setPincode] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [pinFound, setPinFound] = useState(false)
  const [state, setState] = useState('')
  const [district, setDistrict] = useState('')
  const [city, setCity] = useState('')
  const [tehsil, setTehsil] = useState('')
  const [policeStation, setPoliceStation] = useState('')
  const [fullAddress, setFullAddress] = useState('')

  // Confirmation
  const [confirmed, setConfirmed] = useState(false)

  const isPolice = false

  // ── Cascading dropdown data ──────────────────────────────
  const stateNames = getStateNames()
  const districts = state ? getDistrictsForState(state) : []
  const cities = state && district ? getCitiesForDistrict(state, district) : []
  const tehsils = state && district ? getTehsilsForDistrict(state, district) : []
  const policeStations = tehsil ? getPoliceStationsForTehsil(tehsil) : []

  // ── Cascade handlers ─────────────────────────────────────
  const handleStateChange = (val: string) => {
    setState(val)
    setDistrict(''); setCity(''); setTehsil(''); setPoliceStation('')
  }
  const handleDistrictChange = (val: string) => {
    setDistrict(val)
    setCity(''); setTehsil(''); setPoliceStation('')
  }
  const handleCityChange = (val: string) => { setCity(val) }
  const handleTehsilChange = (val: string) => {
    setTehsil(val)
    setPoliceStation('')
  }

  // ── Pincode auto-fill ─────────────────────────────────────
  const handlePincode = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 6)
    setPincode(clean)
    setPinFound(false)
    if (clean.length === 6) {
      setPinLoading(true)
      const result = await lookupPincode(clean)
      if (result) {
        setState(result.state)
        setDistrict(result.district)
        setCity(result.city || '')
        setTehsil(result.division || '')
        setPoliceStation('')
        setPinFound(true)
      }
      setPinLoading(false)
    }
  }

  // ── ID validation ─────────────────────────────────────────
  const handleIdTypeChange = (val: string) => {
    setIdType(val); setIdNumber(''); setIdError('')
  }
  const handleIdNumberChange = (val: string) => {
    const rule = ID_VALIDATION_RULES[idType]
    if (!rule) { setIdNumber(val); return }
    // Auto-uppercase for PAN, Voter, DL, Passport
    const cleaned = ['pan', 'voter_id', 'driving_license', 'passport'].includes(idType) ? val.toUpperCase() : val.replace(/\D/g, '')
    if (cleaned.length <= rule.maxLength) {
      setIdNumber(cleaned)
    }
    // Live validation
    if (cleaned.length > 0 && cleaned.length === rule.maxLength) {
      if (!rule.pattern.test(cleaned.replace(/\s/g, ''))) {
        setIdError(rule.hint)
      } else {
        setIdError('')
      }
    } else {
      setIdError('')
    }
  }

  const currentIdRule = idType ? ID_VALIDATION_RULES[idType] : null

  // ── Validation ────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {}
    if (!fullName.trim()) e.fullName = 'Required'
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = 'Valid email required'
    if (password.length < 8) e.password = 'Min 8 characters'
    if (!/^[6-9]\d{9}$/.test(phone)) e.phone = 'Valid 10-digit mobile'
    if (!fatherName.trim()) e.fatherName = 'Required'
    if (!gender) e.gender = 'Select gender'
    if (!idType) e.idType = 'Select ID type'
    if (!idNumber.trim()) e.idNumber = 'Required'
    if (idType && idNumber) {
      const rule = ID_VALIDATION_RULES[idType]
      if (rule && !rule.pattern.test(idNumber.replace(/\s/g, ''))) {
        e.idNumber = rule.hint
      }
    }
    if (!state) e.state = 'Select state'
    if (!district) e.district = 'Select district'
    if (!policeStation) e.policeStation = 'Select police station'
    if (!fullAddress.trim()) e.fullAddress = 'Required'
    if (!confirmed) e.confirmed = 'You must confirm the declaration'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    setGlobalError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName, email, password, phone, role,
          father_husband_name: fatherName, mother_name: motherName || undefined, gender,
          alternate_mobile: altMobile || undefined, id_proof_type: idType, id_number: idNumber,
          pincode, state, district, city_town: city, tehsil_division: tehsil,
          police_station_area: policeStation, full_address: fullAddress,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Signup failed')
      router.push('/login?message=Account created successfully! You can now sign in.')
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-500/20">
            <Shield className="w-7 h-7 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white font-heading">Citizen Registration</h1>
          <p className="text-gray-400 text-sm mt-1">Register to access emergency services and file reports</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ═══ SECTION 1: ACCOUNT & PERSONAL ═══ */}
          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5">
            {/* Role Selection removed */}
            <div className="flex items-center gap-2 mb-3 text-blue-400">
              <User className="w-4 h-4" />
              <h2 className="text-sm font-bold">Account & Personal Details</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label text="Full Name" required />
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="As per Official ID" className={inputCls(errors.fullName)} />
                <FieldError msg={errors.fullName} />
              </div>
              <div>
                <Label text="Email Address" required />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls(errors.email)} />
                <FieldError msg={errors.email} />
              </div>
              <div>
                <Label text="Password" required />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" className={inputCls(errors.password)} />
                <FieldError msg={errors.password} />
              </div>
              <div>
                <Label text="Mobile Number" required />
                <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile" maxLength={10} className={inputCls(errors.phone)} />
                <FieldError msg={errors.phone} />
              </div>
              <div>
                <Label text="Father's / Husband's Name" required />
                <input value={fatherName} onChange={e => setFatherName(e.target.value)} placeholder="Full name" className={inputCls(errors.fatherName)} />
                <FieldError msg={errors.fatherName} />
              </div>
              <div>
                <Label text="Mother's Name" />
                <input value={motherName} onChange={e => setMotherName(e.target.value)} placeholder="Optional" className={inputCls()} />
              </div>
            </div>

            {/* Gender + ID in row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              {/* Gender Dropdown */}
              <div>
                <Label text="Gender" required />
                <select value={gender} onChange={e => setGender(e.target.value)} className={selectCls(errors.gender)}>
                  <option value="">Select Gender</option>
                  {GENDER_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
                <FieldError msg={errors.gender} />
              </div>

              {/* ID Proof Type Dropdown */}
              <div>
                <Label text="ID Proof Type" required />
                <select value={idType} onChange={e => handleIdTypeChange(e.target.value)} className={selectCls(errors.idType)}>
                  <option value="">Select ID Type</option>
                  {ID_PROOF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <FieldError msg={errors.idType} />
              </div>

              {/* ID Number with constraints */}
              <div>
                <Label text={currentIdRule?.label || 'ID Number'} required />
                <input
                  value={idNumber}
                  onChange={e => handleIdNumberChange(e.target.value)}
                  placeholder={currentIdRule?.placeholder || 'Select ID type first'}
                  maxLength={currentIdRule?.maxLength || 20}
                  disabled={!idType}
                  className={`${inputCls(errors.idNumber || idError ? 'err' : '')} font-mono ${!idType ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                {idError && <p className="text-amber-400 text-[10px] mt-0.5">⚠ {idError}</p>}
                {currentIdRule && !idError && idNumber.length > 0 && (
                  <p className="text-gray-500 text-[10px] mt-0.5">{currentIdRule.hint}</p>
                )}
                <FieldError msg={errors.idNumber} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <Label text="Alternate Mobile" />
                <input value={altMobile} onChange={e => setAltMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Optional" maxLength={10} className={inputCls()} />
              </div>
            </div>

            {/* Police Badge removed */}
          </div>

          {/* ═══ SECTION 2: ADDRESS with Cascading Dropdowns ═══ */}
          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3 text-orange-400">
              <MapPin className="w-4 h-4" />
              <h2 className="text-sm font-bold">Permanent Address</h2>
            </div>

            {/* Pincode Quick Fill */}
            <div className="p-3 bg-[#0B0F1A] border border-blue-500/15 rounded-xl mb-3">
              <p className="text-[10px] text-blue-400 mb-2 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3 h-3" /> Quick Fill — Enter pincode to auto-detect location
              </p>
              <div className="flex gap-2 items-center">
                <div className="flex-1 max-w-[200px]">
                  <input value={pincode} onChange={e => handlePincode(e.target.value)}
                    placeholder="6-digit pincode" maxLength={6}
                    className={`${inputCls()} font-mono`} />
                </div>
                {pinLoading && <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />}
                {pinFound && <span className="text-[10px] text-green-400 font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Location detected</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* State Dropdown */}
              <div>
                <Label text="State" required />
                <select value={state} onChange={e => handleStateChange(e.target.value)} className={selectCls(errors.state)}>
                  <option value="">Select State</option>
                  {stateNames.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <FieldError msg={errors.state} />
              </div>

              {/* District Dropdown */}
              <div>
                <Label text="District" required />
                <select value={district} onChange={e => handleDistrictChange(e.target.value)} disabled={!state}
                  className={`${selectCls(errors.district)} ${!state ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <option value="">{state ? 'Select District' : 'Select state first'}</option>
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <FieldError msg={errors.district} />
              </div>

              {/* City Dropdown */}
              <div>
                <Label text="City / Town" />
                <select value={city} onChange={e => handleCityChange(e.target.value)} disabled={!district}
                  className={`${selectCls()} ${!district ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <option value="">{district ? 'Select City / Town' : 'Select district first'}</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Tehsil Dropdown */}
              <div>
                <Label text="Tehsil / Division" />
                <select value={tehsil} onChange={e => handleTehsilChange(e.target.value)} disabled={!district}
                  className={`${selectCls()} ${!district ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <option value="">{district ? 'Select Tehsil' : 'Select district first'}</option>
                  {tehsils.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Police Station Dropdown */}
              <div>
                <Label text="Police Station Area" required />
                <select value={policeStation} onChange={e => setPoliceStation(e.target.value)} disabled={!tehsil}
                  className={`${selectCls(errors.policeStation)} ${!tehsil ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <option value="">{tehsil ? 'Select Police Station' : 'Select tehsil first'}</option>
                  {policeStations.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <FieldError msg={errors.policeStation} />
              </div>
            </div>

            {/* Full Address */}
            <div className="mt-3">
              <Label text="Full Address" required />
              <textarea value={fullAddress} onChange={e => setFullAddress(e.target.value)} rows={2}
                placeholder="House No., Street, Locality, Landmark..."
                className={`${inputCls(errors.fullAddress)} resize-none`} />
              <FieldError msg={errors.fullAddress} />
            </div>
          </div>

          {/* ═══ DECLARATION CHECKBOX ═══ */}
          <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3 text-amber-400">
              <Lock className="w-4 h-4" />
              <h2 className="text-sm font-bold">Declaration</h2>
            </div>
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <p className="text-gray-300 text-xs mb-3 leading-relaxed">
                Your <strong className="text-amber-400">personal identity information</strong> (Name, Father&apos;s Name, Gender, ID Proof Type &amp; Number) will be <strong className="text-amber-400">permanently recorded</strong> and <strong className="text-amber-400">cannot be changed</strong> after registration. This is to maintain the integrity of your identity as per government norms.
              </p>
              <p className="text-gray-400 text-[11px] mb-3 leading-relaxed">
                📍 <strong className="text-emerald-400">Address information can be updated</strong> later from your profile, as you may be transferred or relocate.
              </p>
              <label className={`flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-white/5 transition-colors ${errors.confirmed ? 'ring-1 ring-red-500/50 bg-red-500/5' : ''}`}>
                <div className="mt-0.5 flex-shrink-0">
                  <div
                    onClick={() => setConfirmed(!confirmed)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                      confirmed
                        ? 'bg-green-600 border-green-600 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                        : 'border-gray-600 bg-transparent group-hover:border-gray-400'
                    }`}
                  >
                    {confirmed && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
                <span className="text-sm text-gray-300 select-none" onClick={() => setConfirmed(!confirmed)}>
                  I hereby declare that all the information provided above is true and correct to the best of my knowledge. I understand that my <strong className="text-white">identity details are non-editable</strong> after registration, while my <strong className="text-emerald-400">address can be updated</strong> later.
                </span>
              </label>
              <FieldError msg={errors.confirmed} />
            </div>
          </div>

          {/* ═══ SUBMIT ═══ */}
          {globalError && (
            <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm">{globalError}</p>
            </div>
          )}

          <button type="submit" disabled={loading || !confirmed}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl py-3.5 font-bold transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Creating Account...</>
            ) : (
              <><CheckCircle className="w-5 h-5" /> Complete Registration</>
            )}
          </button>

          <p className="text-center text-slate-600 text-[10px]">
            By registering, you declare that the information provided is true and understand that providing false information is punishable under law.
          </p>

          <p className="text-center text-slate-500 text-sm pb-4">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:underline font-bold">Sign in</Link>
          </p>

          <p className="text-center text-slate-500 text-sm pb-8">
            Are you a police officer?{' '}
            <Link href="/officer-signup" className="text-orange-400 hover:underline font-bold">Officer Sign Up</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
