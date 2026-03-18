'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Star, Crown, CheckCircle, AlertCircle, User, Briefcase, MapPin, Heart, FileText, Lock } from 'lucide-react'
import { registerOfficer, checkBadgeNumber } from '@/app/(auth)/officer-signup/actions'
import { officerRegistrationSchema } from '@/lib/validations/officer-register'

export default function OfficerRegisterForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [badgeStatus, setBadgeStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [lookingUpPincode, setLookingUpPincode] = useState(false)
  
  const [formData, setFormData] = useState<any>({
    accountType: 'constable',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobile: '',
    altMobile: '',
    fatherName: '',
    motherName: '',
    dateOfBirth: '',
    gender: 'male',
    bloodGroup: 'unknown',
    officialEmail: '',
    idProofType: 'aadhaar',
    idProofNumber: '',
    badgeNumber: '',
    employeeId: '',
    joiningDate: '',
    department: 'Madhya Pradesh Police',
    specialization: 'general_duty',
    pincode: '',
    state: 'Madhya Pradesh',
    district: '',
    cityTown: '',
    tehsilDivision: '',
    fullAddress: '',
    contactName: '',
    relationship: 'spouse',
    emergencyMobile: '',
    emergencyAltMobile: '',
    emergencyAddress: '',
    declarationAccepted: false,
    infoCorrect: false,
    legalAcknowledgement: false
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any
    const val = type === 'checkbox' ? (e.target as any).checked : value
    
    setFormData((prev: any) => ({
      ...prev,
      [name]: val
    }))

    // Clear error for this field
    if (fieldErrors[name]) {
      setFieldErrors((prev: Record<string, string>) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }

    // Auto lookup pincode
    if (name === 'pincode' && value.length === 6 && /^\d{6}$/.test(value)) {
      lookupPincode(value)
    }
  }

  const lookupPincode = async (pin: string) => {
    setLookingUpPincode(true)
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
      const data = await res.json()
      if (data[0].Status === 'Success') {
        const postOffice = data[0].PostOffice[0]
        setFormData((prev: any) => ({
          ...prev,
          district: postOffice.District,
          state: postOffice.State,
          cityTown: postOffice.Block !== 'NA' ? postOffice.Block : postOffice.Name
        }))
      }
    } catch (err) {
      console.error('Pincode lookup failed')
    } finally {
      setLookingUpPincode(false)
    }
  }

  const handleBadgeCheck = async () => {
    if (!formData.badgeNumber) return
    setBadgeStatus('checking')
    const res = await checkBadgeNumber(formData.badgeNumber)
    if (res.available) setBadgeStatus('available')
    else setBadgeStatus('taken')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    // Zod validation
    const validation = officerRegistrationSchema.safeParse(formData)
    if (!validation.success) {
      const errors: Record<string, string> = {}
      validation.error.issues.forEach(issue => {
        const path = issue.path[0] as string
        if (!errors[path]) errors[path] = issue.message
      })
      setFieldErrors(errors)
      setError('Please correct the highlighted errors in the form.')
      
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0]
      const element = document.getElementsByName(firstErrorField)[0]
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      
      setLoading(false)
      return
    }

    try {
      const res = await registerOfficer(formData)
      if (res.success) {
        setSuccess(true)
      } else {
        setError(res.error || (res as any).details?.message || 'Registration failed. Please check if all fields are correct.')
      }
    } catch (err: any) {
      console.error('Submission error:', err)
      setError(err.message || 'Something went wrong. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-2xl">
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-3xl font-black text-white mb-4">Registration Submitted!</h2>
        <p className="text-gray-400 mb-8 text-lg">
          Your account is pending verification. Our admin team will review your credentials and documents.
          You will receive an email once your account is activated.
        </p>
        <div className="bg-[#1A2235] rounded-xl p-6 mb-8 text-left border border-[#1F2D42]">
          <h4 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-3">Next Steps:</h4>
          <ul className="space-y-3 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
              <span>Badge number and employee ID verification</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
              <span>Document authentication by Station SHO</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
              <span>Final approval and system access grant</span>
            </li>
          </ul>
        </div>
        <Link 
          href="/officer-login" 
          className="inline-block bg-orange-600 hover:bg-orange-500 text-white font-black py-4 px-8 rounded-xl transition-all shadow-lg shadow-orange-900/20 uppercase tracking-widest text-sm"
        >
          Go to Login Page
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto pb-20">
      {/* Account Type Selector */}
      <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl p-6 shadow-xl">
        <h3 className="text-xs font-black text-orange-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
          <Shield className="w-4 h-4" /> Select Your Rank
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { id: 'constable', label: 'Constable', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
            { id: 'si', label: 'Sub-Inspector', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { id: 'sho', label: 'SHO', icon: Star, color: 'text-orange-400', bg: 'bg-orange-400/10' },
            { id: 'dsp', label: 'DSP / ACP', icon: Crown, color: 'text-purple-400', bg: 'bg-purple-400/10' },
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setFormData({ ...formData, accountType: type.id })}
              className={`p-4 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-2 ${
                formData.accountType === type.id 
                ? `border-orange-500 ${type.bg}` 
                : 'border-[#1F2D42] hover:border-[#2F3D52] bg-[#1A2235]'
              }`}
            >
              <type.icon className={`w-6 h-6 ${type.color}`} />
              <span className="text-xs font-black uppercase tracking-wider text-white">{type.label}</span>
            </button>
          ))}
        </div>
        
        {/* Dynamic Rank Guidance */}
        <div className="mt-6 bg-[#1A2235] border border-orange-500/20 rounded-xl p-4 flex items-start gap-4">
          <div className="bg-orange-600/10 p-2 rounded-lg">
            <AlertCircle className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
              Joining as {formData.accountType === 'constable' ? 'Beat Officer' : formData.accountType.toUpperCase()}
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              {formData.accountType === 'constable' && "As a Constable, you will be responsible for patrolling assigned Beats and first-point community interaction."}
              {formData.accountType === 'si' && "Sub-Inspectors handle primary investigations, case filing, and report generation for their assigned stations."}
              {formData.accountType === 'sho' && "As a Station House Officer, you will manage station operations and supervise all officers under your jurisdiction."}
              {formData.accountType === 'dsp' && "DSP/ACP role involves administrative oversight of multiple police stations within a Zone."}
              {!['constable', 'si', 'sho', 'dsp'].includes(formData.accountType) && "Please select a valid rank to see the role description."}
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Personal Details */}
      <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-[#1A2235] border-b border-[#1F2D42] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Section 1: Personal Details</h3>
          </div>
          {step > 1 && <CheckCircle className="w-5 h-5 text-green-500" />}
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Full Name *" name="fullName" value={formData.fullName} onChange={handleChange} required error={fieldErrors.fullName} />
          <Input label="Email Address *" name="email" type="email" value={formData.email} onChange={handleChange} required error={fieldErrors.email} />
          <Input label="Password *" name="password" type="password" value={formData.password} onChange={handleChange} required error={fieldErrors.password} />
          <Input label="Confirm Password *" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required error={fieldErrors.confirmPassword} />
          <Input label="Mobile Number *" name="mobile" value={formData.mobile} onChange={handleChange} required placeholder="10-digit number" error={fieldErrors.mobile} />
          <Input label="Father's Name *" name="fatherName" value={formData.fatherName} onChange={handleChange} required error={fieldErrors.fatherName} />
          <Input label="Mother's Name" name="motherName" value={formData.motherName} onChange={handleChange} error={fieldErrors.motherName} />
          <Input label="Date of Birth *" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} required error={fieldErrors.dateOfBirth} />
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Gender *</label>
            <select 
              name="gender" 
              value={formData.gender} 
              onChange={handleChange}
              className={`w-full bg-[#1A2235] border ${fieldErrors.gender ? 'border-red-500' : 'border-[#1F2D42]'} rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500`}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {fieldErrors.gender && <p className="text-[10px] text-red-500 mt-1 uppercase font-bold tracking-wider">{fieldErrors.gender}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Blood Group</label>
            <select 
              name="bloodGroup" 
              value={formData.bloodGroup} 
              onChange={handleChange}
              className="w-full bg-[#1A2235] border border-[#1F2D42] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500"
            >
              {['A+','A-','B+','B-','O+','O-','AB+','AB-','unknown'].map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">ID Proof Type *</label>
            <select 
              name="idProofType"
              value={formData.idProofType}
              onChange={handleChange}
              className={`w-full bg-[#1A2235] border ${fieldErrors.idProofType ? 'border-red-500' : 'border-[#1F2D42]'} rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500`}
            >
              <option value="aadhaar">Aadhaar (12 digits)</option>
              <option value="pan">PAN Card</option>
              <option value="driving_licence">Driving Licence</option>
              <option value="passport">Passport</option>
              <option value="employee_id">Existing Gov ID</option>
            </select>
            {fieldErrors.idProofType && <p className="text-[10px] text-red-500 mt-1 uppercase font-bold tracking-wider">{fieldErrors.idProofType}</p>}
          </div>
          <Input label="ID Number *" name="idProofNumber" value={formData.idProofNumber} onChange={handleChange} required error={fieldErrors.idProofNumber} />
        </div>
      </div>

      {/* Section 2: Service Details */}
      <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-[#1A2235] border-b border-[#1F2D42] p-4 flex items-center gap-3">
          <Briefcase className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Section 2: Service Details</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Badge Number *</label>
              <div className="flex gap-2 relative">
                <input
                  type="text"
                  name="badgeNumber"
                  value={formData.badgeNumber}
                  onChange={handleChange}
                  placeholder="MP-1234"
                  className={`w-full bg-[#1A2235] border ${fieldErrors.badgeNumber || badgeStatus === 'taken' ? 'border-red-500' : 'border-[#1F2D42]'} rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 placeholder:text-gray-700 transition-all`}
                  required
                />
                <button
                  type="button"
                  onClick={handleBadgeCheck}
                  disabled={!formData.badgeNumber || badgeStatus === 'checking'}
                  className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 px-4 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap"
                >
                  {badgeStatus === 'checking' ? 'Checking...' : 'Check'}
                </button>
                {badgeStatus === 'available' && (
                  <div className="absolute -bottom-5 right-0 text-[10px] text-green-500 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Available
                  </div>
                )}
                {badgeStatus === 'taken' && (
                  <div className="absolute -bottom-5 right-0 text-[10px] text-red-500 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Already Registered
                  </div>
                )}
              </div>
              {fieldErrors.badgeNumber && <p className="text-[10px] text-red-500 mt-1 uppercase font-bold tracking-wider">{fieldErrors.badgeNumber}</p>}
            </div>
            <Input label="Joining Date *" name="joiningDate" type="date" value={formData.joiningDate} onChange={handleChange} required error={fieldErrors.joiningDate} />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Specialization</label>
            <div className="flex flex-wrap gap-2">
              {['general_duty', 'traffic', 'crime', 'cyber_cell', 'women_safety'].map(spec => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => setFormData({...formData, specialization: spec})}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                    formData.specialization === spec 
                    ? 'bg-orange-500 border-orange-500 text-white' 
                    : 'bg-[#1A2235] border-[#1F2D42] text-gray-500 hover:border-gray-600'
                  }`}
                >
                  {spec.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Address */}
      <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-[#1A2235] border-b border-[#1F2D42] p-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Section 3: Address</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <Input label="Pincode *" name="pincode" value={formData.pincode} onChange={handleChange} required error={fieldErrors.pincode} placeholder="452001" />
            {lookingUpPincode && <div className="absolute right-3 top-9 w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>}
          </div>
          <Input label="District *" name="district" value={formData.district} onChange={handleChange} required error={fieldErrors.district} />
          <Input label="City/Town *" name="cityTown" value={formData.cityTown} onChange={handleChange} required error={fieldErrors.cityTown} />
          <Input label="State *" name="state" value={formData.state} onChange={handleChange} required error={fieldErrors.state} />
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Full Residential Address *</label>
            <textarea
              name="fullAddress"
              value={formData.fullAddress}
              onChange={handleChange}
              rows={3}
              className={`w-full bg-[#1A2235] border ${fieldErrors.fullAddress ? 'border-red-500' : 'border-[#1F2D42]'} rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 placeholder:text-gray-700 transition-all`}
              placeholder="House No., Street, Area..."
              required
            ></textarea>
            {fieldErrors.fullAddress && <p className="text-[10px] text-red-500 mt-1 uppercase font-bold tracking-wider">{fieldErrors.fullAddress}</p>}
          </div>
        </div>
      </div>

      {/* Section 4: Emergency Contact */}
      <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-[#1A2235] border-b border-[#1F2D42] p-4 flex items-center gap-3">
          <Heart className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Section 4: Emergency Contact</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Contact Name *" name="contactName" value={formData.contactName} onChange={handleChange} required error={fieldErrors.contactName} />
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Relationship *</label>
            <select 
              name="relationship" 
              value={formData.relationship} 
              onChange={handleChange}
              className={`w-full bg-[#1A2235] border ${fieldErrors.relationship ? 'border-red-500' : 'border-[#1F2D42]'} rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500`}
            >
              <option value="spouse">Spouse</option>
              <option value="parent">Parent</option>
              <option value="sibling">Sibling</option>
              <option value="child">Child</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Input label="Mobile *" name="emergencyMobile" value={formData.emergencyMobile} onChange={handleChange} required error={fieldErrors.emergencyMobile} />
          <Input label="Emergency Address" name="emergencyAddress" value={formData.emergencyAddress} onChange={handleChange} error={fieldErrors.emergencyAddress} />
        </div>
      </div>

      {/* Section 6: Declaration */}
      <div className="bg-[#111827] border border-[#1F2D42] rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-[#1A2235] border-b border-[#1F2D42] p-4 flex items-center gap-3">
          <FileText className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Section 5: Declaration</h3>
        </div>
        <div className="p-6 space-y-4">
          <Checkbox 
            label="I hereby declare that all the information provided above is true and correct." 
            name="declarationAccepted" 
            checked={formData.declarationAccepted} 
            onChange={handleChange} 
          />
          <Checkbox 
            label="I understand that my identity details are non-editable after approval." 
            name="infoCorrect" 
            checked={formData.infoCorrect} 
            onChange={handleChange} 
          />
          <Checkbox 
            label="I acknowledge that providing false information is a punishable offence." 
            name="legalAcknowledgement" 
            checked={formData.legalAcknowledgement} 
            onChange={handleChange} 
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold uppercase tracking-wider">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !formData.declarationAccepted || !formData.infoCorrect || !formData.legalAcknowledgement}
        className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-5 px-8 rounded-2xl transition-all shadow-xl shadow-orange-900/20 uppercase tracking-[0.3em] text-sm flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Processing Application...</span>
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            <span>Complete Official Registration</span>
          </>
        )}
      </button>

      <div className="text-center space-y-4 pt-4">
        <p className="text-sm text-gray-500 font-bold">
          Already have an account? <Link href="/officer-login" className="text-blue-400 hover:underline">Sign in as Officer</Link>
        </p>
        <p className="text-xs text-gray-600">
          By registering, you declare the information entered is true. Providing false information is punishable under Indian Law.
        </p>
      </div>
    </form>
  )
}

function Input({ label, name, value, error, ...props }: any) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</label>
      <input
        name={name}
        value={value}
        {...props}
        className={`w-full bg-[#1A2235] border ${error ? 'border-red-500' : 'border-[#1F2D42]'} rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 placeholder:text-gray-700 transition-all`}
      />
      {error && <p className="text-[10px] text-red-500 mt-1 uppercase font-bold tracking-wider">{error}</p>}
    </div>
  )
}

function Checkbox({ label, ...props }: any) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        {...props}
        className="mt-1 w-4 h-4 rounded border-[#1F2D42] bg-[#1A2235] text-orange-500 focus:ring-orange-500 focus:ring-offset-0 transition-all shrink-0"
      />
      <span className="text-xs text-gray-400 font-bold group-hover:text-gray-300 transition-colors uppercase tracking-wider leading-relaxed">{label}</span>
    </label>
  )
}
